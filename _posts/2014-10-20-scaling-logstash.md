---
layout: post
category: software
tagline: "Scaling Logstash"
tags : [logtash, logging, elasticsearch]
---
I've had to wear my dev ops hat for a bit at [ShippingEasy](http://shippingeasy.com/)
recently in setting up an ELK stack to provide log aggregation and operational analytics.
That is [Elasticsearch](http://www.elasticsearch.org/), [Logstash](http://logstash.net/)
& [Kibana](http://www.elasticsearch.org/overview/kibana/).  We've become pretty dependent
on the infrastructure, as it enables us to keep an eye on how things are running and
delve into problems in production when support escalations dictate devs get involved.
Here is a view of our production web dashboard showing metrics like average response
time, unicorn workers & queue sizes.

![Web Dashboard]({{ site.url }}/assets/images/logstash_web.png)

When this was originally set up, it was done with
[Logstash-Forwarder](https://github.com/elasticsearch/logstash-forwarder) on each app server
forwarding log events to Logstash which munged them and indexed them into Elasticsearch.
We could then visualize those log events with Kibana.  This is a typical (possibly naive)
setup that looks something like this:

{% highlight bash %}
logstash-forwarder
                   \
logstash-forwarder  > logstash > elasticsearch < kibana
                   /
logstash-forwarder
{% endhighlight %}

To get views into the Rails stack, we parsed the log files using multiline and grok
filters with custom patterns in Elasticsearch.  We got around log events interleaving
with each other by having each unicorn process write to its own numbered log file.
This worked well for awhile, but eventually we started to run into problems as traffic
started to ramp up towards a holiday buying season.  Things would work for awhile, but
then gaps of events would start to show up in Kibana, slowing to a trickle and eventually
stop.

Thankfully, it was not that our application was dying.  Logstash was.  Digging in, it
turned out we had two problems that exacerbated and masked each other:

1.  Logstash could not keep up with the demands of munging all of the log events we
were sending to it.
1.  Logstash 1.4.1-2 has a [bug in its TCP input](https://github.com/elasticsearch/logstash/issues/1509)
that causes it to have a connection leak when clients connecting to it start to time
out due to the previous issue.

We fixed the 2nd problem first, patching our version of Logstash with the latest code
that fixes the connection bloom problem.  With that cleared up, we could look at what
the bottleneck was within Logstash.

Logstash is written in jRuby, and its internals are described as [a pipeline](http://logstash.net/docs/1.4.2/life-of-an-event).
Things are processed by input, filter(worker) and output threads that do the work 
that is set up in the input/filter/output stanzas of the configuration.  Each of
these areas is fronted by a queue that can hold 20 elements.  The threads pull from
the queue, do their work, pass it on to the next queue or out and repeat.  Out of the
box, Logstash allocates one thread to each input, a single worker thread, and one
thread for each output.  This looks something like this:

{% highlight bash %}
input source --> input thread   filter thread   output thread --> output destination
                            \   /           \   /
                            queue           queue
                            /   \           /   \
input source --> input thread   filter thread   output thread --> output destination
{% endhighlight %}

Problems crop up when any of these areas of Logstash cannot pull from its queue faster
than it is filling up.  Logstash as a system backs up, with varying effects depending
on what your input is.  In our case, it was Logstash-Forwarder connection timeouts and
subsequent connection leaking on attempts to reconnect.  If Logstash was pulling from
a redis list as a queue, it would be queue bloat.

Using a combination of top and java thread dumps, we could see our bottleneck was in
the filter worker thread.  The input threads and output threads had little CPU use
and looked to be blocking on their empty queues at all times.  The filter worker thread
was pegging a CPU core, however.  Easy enough, lets just up the number of worker
threads in our Logstash deployment.

Wrong.  Remember that multiline grok filtering I mentioned earlier?  Turns out that
Logstash's multiline filter is not thread safe and when you use it, you are limited to
only using 1 worker thread.  Okay, then you simply move the multiline event collection
into the input area of Logstash using a multline codec.  Nope, that won't work either.
The multline filter allows you to specify a stream_identity attribute that can be
used to keep the events separated by file name.  The multiline input codec offers no
such thing, which would mean all our efforts to keep rails multiline log messages
separate from each other would be out the window.

Now we had to step back and re-evaluate the infrastructure.  Ultimately, we decided
to do the following:

1. Do the multi-line event roll up on the app server side.  This would become the
responsibility of whatever was tailing the logs and shipping it to Logstash.  We could
then chuck the multiline filter in Logstash and scale out our filter workers within
a single Logstash process.
1. Use a redis list as a broker between the tailing daemon app-server side and Logstash
so that we could have some event durability and have the potential to scale out to
multiple Logstash processes on multiple machines to munge through our log data.

Logstash forwarder supports neither mutli-line event roll up or communicating to
redis, so this meant we had to find another tailing daemon that did, or we had to deploy
Logstash itself to each app server.  We really did not want to do the latter, as it
introduced java dependencies and seemed very heavy for what needed to be done.

Enter [Beaver](https://github.com/josegonzalez/python-beaver), a log tailing daemon
written in Python that supports both of the above requirements.  We did a quick 
[proof of concept](https://gist.github.com/lwoodson/1b0b34257e5ee652917c) to make
sure it would work, deployed it to one web server to see how it performed over 24
hours and then pushed it out across all our servers.  Things have been working well
for several days with no service interruptions.  Now our infrastructure looks like
this:

{% highlight bash %}
beaver
      \
beaver > redis < logstash > elasticsearch < kibana
      /
beaver
{% endhighlight %}

One Logstash instance is still enough for us after pushing multiline-roll up
responsibilities to the Beaver on app servers and being able to use multiple threads/cores
to do filter processing in Logstash.  But when increasing log traffic/size again
starts to overwhelm Logstash, we are better positioned to scale out to multiple
instances munging the data being pushed to redis:

{% highlight bash %}
beaver           logstash
      \         /        \
beaver > redis <          > elasticsearch < kibana
      /         \        /
beaver           logstash
{% endhighlight %}

It was an interesting 3-4 days spent in Logstash-scale land.  It is an amazing tool
that really helps us deliver a quality experience to users of our application.  As
part of an ELK stack, it is the 80% of [Splunk](http://www.splunk.com/) that you
really want at no cost.  But without paid licensing, you have to roll up your sleeves
and get to work in cases like these.  Fortunately, there is a great
community behind it and lots of help to be found on the web and in #logstash at
freenode.

{{post.url}}
