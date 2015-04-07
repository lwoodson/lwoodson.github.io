---
layout: post
category: data
tagline: "Bringing Machine Learning to a Ruby on Rails Application"
tags: [data science, machine learning, ruby, python, scikit learn]
---
At [ShippingEasy](http://shippingeasy.com/), we take customer's orders from various online storefronts and allow
the customer to easily generate shipping labels to fulfill those orders at a reduced
cost.  To make life even easier on our customers, we wanted to automate the process
of decision making when purchasing a label.  After all, we had a large example set
of data for them -- the orders we've received and the various shipping choices
that were made from them.  Given that data, couldn't we use machine learning to
infer what actions a customer would take when confronted with an order in our
UI?

The answer was yes.  We developed a system dubbed AutoShip that allows us to predict
customer's shipping choices with great accuracy.  We even made a snazzy marketing
video with really soothing music!

<iframe width="560" height="315" src="http://www.youtube.com/embed/b49OJZlMEgo" frameborder="0" allowfullscreen>
</iframe>

Getting there was not so easy, however.  Our application is written in Ruby on
Rails.  While our team is full of great software engineers and web development
gurus, none of us were data scientists by trade.  Here are 3 lessons 
learned or relearned on the
journey to bring machine learning to our product.

### 1. Stand on the Shoulders of Giants
Ever hear that truism?  Well, it was hammered home on this project.  I love [Ruby](https://www.ruby-lang.org/en/) as
a language and feel [Rails](http://rubyonrails.org/) is a pretty good framework for building web applications.
But they are not exactly paragons for scientific or statistical computing.  Looking
for a machine learning lib in Ruby?  Good luck.  There are libraries in other
languages that are strong in this area of computer science, however.  [Python's](https://www.python.org/)
[SciKit Learn](http://scikit-learn.org/stable/) library is one example that far
outclasses anything found in Ruby.  So we spiked a proof of concept using it and
were up and running towards a final solution.

The moral here is you really should use the best tool for the job.  Ruby is a
square peg to the round hole of machine learning.

### 2. Play To Your Strengths
We had a workable solution, now we needed to bring it to the product.  Should
we port to Ruby?  Should we stick with Python, the one that had brought us this far?
We decided on the latter, implementing it as a small microservice web application
using [Flask](http://flask.pocoo.org/).

Services, even if you attach a micro prefix to them, bring a complexity to all
environments -- development, test/ci, production.  To help simplify this, I packaged
the microservice application in a [Docker](https://www.docker.com/) [container](http://en.wikipedia.org/wiki/LXC).  Thus it could be run in
development without RoR developers having to set up a Python environment.  In
production, we deploy the containerized application behind an [Haproxy](http://www.haproxy.org/) load balancer,
with [Serf](https://www.serfdom.io/) managing the cluster of microservice containers to automagically add
themselves to the load balancer.  This enables us to have a scalable infrastructure
that can grow easily as our needs increase.  I plan to elaborate on this further
in a future post.

The upshot of all this is that implementing the feature as a microservice written
in Python was much easier, at least for me, than trying to rewrite the excellent
machine learning algorithms found in SciKit Learn in Ruby.  I am a systems engineer
with devops skills, and coming up with a robust and scalable microservice
infrastructure was more easily accomplished than suddenly reinventing myself as a
data science uber geek.

### 3. Polyglot Persistence.  Yes, its a thing.
We use [Postgres](http://www.postgresql.org/) as our main database.  All of our order and shipment data lived
there.  At first glance, it would seem like we should just use the data as found
in the relational database to back the system.  But for a number of reasons,
we decided to use [Elasticsearch](https://www.elastic.co/) as the repository for the data that our system
would use.

First, it stores unstructured documents.  We weren't exactly sure what data we
would need, or how it might evolve over time.  We could shove literally anything
into it and get it back out again without having to migrate a schema.  This
was a very nice boon to have when being exploratory with the data to try and
determine exactly what might yield the results we were after.

Second, its fast and scalable.  If we denormalized an order, shipment and prediction
data into the same document, we would not have to do any complex joins while trying to
get large sets of order/shipment/prediction data used to train a machine learning
algorithm.  And being elastically scalable would mean Elasicsearch could grow
as much as we needed it to.

Lastly, it has [Kibana](https://www.elastic.co/products/kibana), an amazing data visualization tool.  I had already set up
an Elasticsearch/Logstash/Kibana stack as outlined in a [previous post](http://devquixote.com/devops/2014/10/20/scaling-logstash/).  Pointing
it at our order, shipment and prediction data has allowed us to have a tremendous
ability to delve into our data.  Without writing any code, we could easily visualize
the answers to questions like "For customer A, what were the packaging choices that
were made by our prediction service for the predictions that proved inaccurate?"  It was invaluable
during the exploratory phase, and is perhaps even more so as the feature is moving
into support-mode post-rollout.

### At the end of the day...
While we had some stumbles along the way, we were able to achieve our goals of
providing > 95% accuracy on predicting shipments for a customers orders.  In doing
so, [we are providing a great service for our customers that makes their jobs
much easier](http://finance.yahoo.com/news/shippingeasy-introduces-industrys-first-smart-130000411.html).  As for myself, I got to learn quite a bit about machine learning
and using Linux containers in a production environment.  It was challenging, but
a tremendous amount of fun.  Thanks, for the opportunity, ShippingEasy!
