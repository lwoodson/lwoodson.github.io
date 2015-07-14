---
layout: post
category: devops
tagline: 'Docker Fueled Microservices (Part 2)'
tags: [devops, engineering]
description: Decisions, hurdles and thoughts after delivering a Microservice deployed with Docker
thumbnail: /assets/images/chet-600x600.jpg
---
When [bringing machine learning to ShippingEasy](http://devquixote.com/data/2015/04/18/practical-machine-learning-for-the-uninitiated/)
last year, decisions were
made to implement the predictive aspects in Python, to make it a microservice,
and to deploy it in all environments using Docker containers.  This is the second
of two posts detailing the the thinking behind these decisions, hurdles, and
some thoughts on microservices and Linux containers in light of the experience.
You can [read part 1 of the series here](/devops/2015/07/13/docker-fueled-microservices-part-1/).

### Microservice Hurdles
<img style="float: right; padding-left: 20px" src="{{ site.url }}/assets/images/anchorman.jpg"/>
While deciding on a microservice approach solved many issues, it gave rise to
others.  We now had to host and operate two applications written in two
languages that collaborated together in distributed fashion with all of the
fragility that entails.  And even though our engineers didn’t *have* to run the
prediction app to develop the customer facing aspects of the prediction feature,
it would become necessary as we had to support the feature in the wild to
reproduce production issues and validate their fixes.


### Enter Docker
<img style="float: left; padding-right: 20px" src="{{ site.url }}/assets/images/chet_meme.jpg"/>
Here is where [Docker](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-getting-started)
and [Linux containers (LXC)](https://en.wikipedia.org/wiki/LXC) came into the mix.  If you are not
familiar with these technologies, you might want to read those links for context.
An oversimplified description of Docker is that it is a way to
bundle applications with their Linux runtime environment into a *container* -- the packages,
software, libraries and resources needed for the application to do its job.
These applications run within their own process/user/filesystem sandbox on a host
machine and with their own network interface.  Containers are similar to a virtual
machine, but much lighter as it shares the host’s kernel.  Containers can be built from other
containers to cut down on the amount of repeated provisioning tasks.  Docker Hub makes
it easy to push/pull containers and otherwise transport them around your
environments and hosting services.

For our scenario, Docker offered many benefits:

* We could build a container with the Python environment set up to run the
prediction application.
* Developers could run the fully integrated app locally using the prediction app
as a Docker container without having to build out their own Python environment.
* We would not have to make, build, install all of the dependencies for Python
and SciKit Learn in staging or production environments, either.  Again, we did
this once, in the container, and never had to repeat.
* This would be a great opportunity to dip our toes into the container waters.
If things worked well, we could leverage the lessons learned for future
improvements to our infrastructure.
* By learning how to deploy and host Docker containers in a production
environment, and using reusable base containers to build on top of, a uniform
and repeatable process could be developed.  This would work not just for Python
and SciKit Learn and the other dependencies for our little prediction
application, but for any technology we want to bring to bear against a problem
as its own microservice application as long as the apps communicated in a
similar fashion (HTTP).

Let that last bullet point sink in a bit, because I think this is where the hype
of containers could be realized.  If an application and all of its dependencies
could be bundled into one or more containers, and any container can be deployed
and hosted in the same uniform way, then you suddenly have seriously mitigated
the operational overhead of embracing a polyglot approach to programming or
persistence which is a cornerstone of the microservice philosophy.

### Docker in Development
[Docker-compose](https://docs.docker.com/compose/) is used in development to
manage dependencies for the main app.  This includes all middleware and the
prediction application.  Our docker-compose.yml file looks something like this
(omitting things like ports, volumes, environment vars, etc…).

{% highlight ruby linenos %}
# Persistence & middleware
postgres:
  image: postgres:9.4.1
redis:
   image: redis:2.8.19
memcached:
  image: memcached:1.4.24
elasticsearch:
  image: barnybug/elasticsearch:1.5.0

# Microservice app
predictor:
  image: se/autoship:1.0.0
links:
  - redis
  - elasticsearch
{% endhighlight %}


<img style="float: right; padding-left: 20px" src="{{ site.url }}/assets/images/doof_warrior_meme.jpg"/>
This allows us to use Docker to manage and run all of our apps dependencies --
including the predictor microservice application.  Simply by pulling the
predictor container from DockerHub, the app can be run in all of its
distributed-but-collaborating glory.  One downside of microservices mitigated.

There is another benefit to this setup.  Persistence and middleware dependencies
like Postgres, Elasticsearch, Redis and Memcache being managed by Docker allow
us to easily switch versions in our dev environments and to stay in sync with
what is running in production.  If you come from the Ruby/Python world, Docker
acts like RVM/VirtualEnv but for all of the infrastructure dependencies of your
application.  Docker thus also brings one closer to the realization of a
[12-factor app](http://12factor.net/) and lessens the time it takes to get a dev
environment up and running.

### Docker in Production
<img style="float: left; padding-right: 20px" src="{{ site.url }}/assets/images/mordor_meme.jpg"/>
Realizing the benefits of Docker in a production environment where you would
need to span multiple hosts is not as easy as development (me add
docker-compose.yml file to project, me smart).  There are many cloud and
self-managed options for this in various stages of development and readiness,
including [Amazon Container Service](http://aws.amazon.com/ecs/),
[Google Container Engine](https://cloud.google.com/container-engine/),
[Kubernetes](http://kubernetes.io/),
[CoreOS/Fleet/Etcd](https://coreos.com/),
[Docker Swarm](https://docs.docker.com/swarm/),
[Deis](http://deis.io/),
[Flynn](https://flynn.io/),
[Registrator](https://github.com/gliderlabs/registrator),
[Weave](http://weave.works/) and probably
others that have leaked out of my head since I last looked.

Unfortunately, at the time we decided to take all of this on, none of the above
efforts were ready for production use or would be serious investments when we
had no trust yet in Docker as a technology that we wanted to commit to.  If we
were going to use Docker in production, we were going to have to do some
significant work ourselves.

We opted for a relatively simple solution influenced by [this blog post from
CenturyLinkLabs](http://www.centurylinklabs.com/decentralizing-docker-how-to-use-serf-with-docker/).
This was good for us in our scenario as we were not wanting to invest too much into
how we hosted Docker containers. Wwe wanted to first see if it lived up to
the hype and if so, revisit hosting later when some of the
major projects previously mentioned had matured.  We let [Haproxy’s load balancing and
health checks](http://www.haproxy.org/) to do the heavy lifting for us.  We use
[Serf from Hashicorp](https://www.serfdom.io/) (a fine tool in its own right) to
manage hosts entering and leaving the cluster.
Hosts are [provisioned with Chef](https://www.chef.io/) and do little other than install Docker, ensure
host networking is set up correctly, and setup SSHD.   The topology of our
microservice infrastructure in production looks like this:

<img src="{{ site.url }}/assets/images/autoship_infrastructure.png"/>

* On the gateway host, we run an Haproxy load balancer container.
It is exposed to our internal network segment via port 80.  This is the
predictor endpoint that our main application communicates to.  Haproxy will
receive the requests and then round-robin them to any application containers
that register with the load balancer.
* The load balancer container also runs a Serf agent so that it will receive
member-join and member-leave events as hosts join the cluster.
* On every host in the cluster, we run N predictor applications as Docker
containers.  These are exposed via Docker’s port forwarding.  The ports on the
host machine are within a predictable range, starting at 8000 and incrementing
by 1 for each application container.  Thus if we were running 12 application
containers on a host, ports 8000-8012 would be where haproxy could forward
requests to.
* On every host, we run a Serf agent container that has links to each of the
predictor applications being run on the host.  The linking ensures that the
Serf agent container is brought up last, after all of the application containers
are ready to serve requests.
* The Serf agent container on an application host joins the load balancer’s
Serf agent, triggering a member-join event. The load balancer’s Serf agent
reacts by rewriting Haproxy’s config to have backend server entries for each of
the predictable ports for the new host (8000-8012).  Haproxy is reloaded and the
new host and all of its containers are brought into rotation.  The reverse
happens with member-leave events.
* Zero downtime deployments are accomplished through container versioning and
deploying a new version of the container serially a host at a time.

<img style="float: right; padding-left: 20px" src="{{ site.url }}/assets/images/spinal_tap_meme.jpg"/>
This gives us a modestly elastic ability to scale the predictor application
independently of our primary application.  The primary application only ever
communicates via HTTP to the gateway host on port 80 (the haproxy loadbalancer).
Behind that, we can bring new hosts up and down to scale as needed and they are
brought into and removed from rotation via Serf’s magic.

Returning to the promise of containers, If we were to adopt more microservices
that exposed themselves as web services, this infrastructure would be repeatable
regardless of the technology in use by the microservice application.  A Java app
using Neo4J as a data store?  A Scala app using Riak?  No problem.  The Haproxy
+ Serf container fronting the application could be reused.  The pattern of each
host running a Serf container linking to N application containers running on
predictable ports could be reused.

I am dubious of recommending our precise infrastructure to others.  There has
been an awful lot of community effort by very smart people into the various
container-serving technologies mentioned previously.  They are maturing and many
have been ready for production use for awhile.  When/if we look at serving other
applications (perhaps our main application) with Docker, I want to revisit our
infrastructure.  It is relatively simple and works, but the promise of these
other technologies could make scaling and coordinating different collaborating
applications in a production environment even easier.

### Conclusions
<img style="float: left; padding-right: 20px" src="{{ site.url }}/assets/images/oag_meme.jpg"/>
The microservice model is a way to use smaller-scale,
distributed-but-collaborating applications to manage complexity that would grow
in a factorial fashion within a monolithic application.  They in particular have
applicability to large organizations that would collapse under their own weight
otherwise, but also are useful in smaller organizations where the standard stack
is a poor choice for a problem or where operational requirements dictate a
split.  There are many tradeoffs to microservices and distributed applications,
not the least of which is operational complexity.  Linux containers, however,
hold great promise to lessen the scope of this operational burden.
Microservices and container technologies like Docker compliment each other --
each increasing the other’s viability and/or value.

