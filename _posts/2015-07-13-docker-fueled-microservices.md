---
layout: post
category: devops
tagline: 'Docker Fueled Microservices'
tags: [devops, engineering]
---
Last fall, when tasked with bringing machine learning to ShippingEasy to make
predictions in the e-commerce fulfillment domain, a decision was made to
implement the predictive aspects in Python, to make it a microservice, and to
deploy it in all environments (dev, test, staging, production) using Docker
containers.   This post will detail the thinking behind these decisions,
hurdles, and some thoughts on microservices and linux containers in general in
light of the experience.

### The Problem and its Solution
<img style="float: left; padding-right: 20px" src="{{ site.url }}/assets/images/chappelle_meme.jpg"/>
I’ve detailed the problem elsewhere, so I won’t spend too much time expanding on
it here.  We needed to use machine learning algorithms to predict how our
customers would ship their orders given a historical set of their orders and how
they were shipped.  Ruby is an amazing, elegant language and Rails is an great
tool for bootstrapping a product and getting to market.  But neither are tools
for scientific computing.  Hardly anything exists in the machine learning realm,
and what does is not mature with a large community of experts behind it.

Python, however, is known for its scientific and statistics libraries and
communities.  It has a great machine learning library in SciKit learn.  These
tools proved themselves through investigation into our problem, providing good
results in a proof-of-concept.  They were the right tools for the job and gave
us a solution to our domain problem.

### The Problem with the Solution
<img style="float: right; padding-left: 20px" src="{{ site.url }}/assets/images/pythonista.jpg"/>
As a lean start-up development organization, we are heavily coupled to
Ruby/Rails.  Our application is generally a monolithic Ruby on Rails app.  We
use Resque for background processing, and have some integrations split into
engines, but by and large we are a monolith.  The same Ruby/Rails code is
deployed to web servers as is deployed to worker servers.

Our development team, while populated with some of the best engineers I’ve ever
worked with, are by and large Ruby/Rails developers first and foremost.  A few
of us are polyglots, but all of us have at least our recent experience dominated
by Ruby/Rails.  Its what we knew how to write, test, deploy, operate, maintain
and support.

Bringing Python into the mix thus presented many problems. Our development team
would need to have Python environments set up locally to run the app in its
entirety.  We would need to deploy and run this code written in a foreign
language in staging and production.  It would need to interact with our
Ruby/Rails code. And once everything was working together, we would need to be
able to support it operationally and as a product.

### Enter Microservices
<img style="float: left; padding-right: 20px" src="{{ site.url }}/assets/images/burgundy_meme.jpg"/>
Martin Fowler and others at ThoughtWorks have organized their observations of
how large tech organizations manage disparate teams working with different
technologies to be at least the sum of their parts.  They call their thoughts
Microservices.  I wish they had chosen a different name, simply because
“service” is such an overloaded term, and most of the time I hear someone
discussing microservices, I think they misunderstand what it means, at least how
Martin Fowler would define it.  Or perhaps I am the one that misunderstands!

At any rate, everything here seemed to fit the case for a microservice. There
was a natural dividing line around the business capability of predicting
shipments and the rest of our app.  That dividing line had an easy interface to
design -- given an order, predict a shipment.  This functionality needed to be
delivered using different technology than our primary stack.  The app as a whole
did not need to know anything about how the prediction was made, it just needed
to ask for and receive an accurate prediction.  Likewise, the predictive
component needed only a small fraction of the data from our main application to
make its predictions.  Thus there was an easy partitioning of data for the two
applications.

On the human front, our team as a whole didn’t need to know how the prediction
application worked.  To work on the customer-facing aspects of the feature, they
just needed predictions to show up within the main application.  So  though we
are not a large organization, splitting this functionality into its own
application had benefits on the team front.  Only a couple of people had to be
burdened with how things worked internally within the prediction app.  Everyone
else could remain blissfully ignorant.

To me, the case for a microservice architecture emerged from the depths of our
problem.  There was no way we were going to remain solely a RoR application if
we were going to deliver this feature.  The appropriate tools to solve the
business problem dictated the architecture, not the other way around.  And it
clearly has been proven to be the right decision.

### Move Over, Rube Goldberg
Now is a good time to pause and take a look at how the microservice
architecture was shaping up. We decided on a web-service vs messaging for
reasons I won’t elaborate on here.  On the side of our main application, the
gross architecture looks like this...

<img src="{{ site.url }}/assets/images/autoship_arch1.png"/>

* Orders flow into our system, either from a direct API call to us (push) or by
us fetching the order from a store integration (pull).  The order is persisted
in our primary database and a prediction is requested from a PredictionService
within the main application.
* The PredictionService asks a PredictionProxy for a prediction to the order.
* The proxy is what actually talks to the python microservice application.  It
takes the order, marshalls it to JSON, makes the web request of the
microservice, unmarshalls it and hands it back to the service.
* The service takes the prediction, validates the data, builds a Prediction
object in the main application and persists it associated with the order.
* Within our main application interface, customers can see which orders can be
shipped using our validated predictions.  They then send the orders to an
intermediary screen for review of the predicted choices of carrier, service,
packaging and so on.  From there they can purchase and print the shipping labels
using the predicted choices in bulk.

On the Prediction application side, the gross architecture looks like this:

<img style="float: left;padding-right: 20px" src="{{ site.url }}/assets/images/autoship_arch2.png"/>

* A web request for a prediction is received.
* We attempt to look up a cached customer data model from Redis.  This is a
trained algorithm using recent data for the customer.  We cache the customer
data models for up to 24 hours as training the algorithm with a customer’s data
set is an expensive operation.
* If we have no cached customer model, we fetch the customer’s recent shipping
data from Elasticsearch, build a trained model, and cache it in redis for up to
24 hours.
* We take the trained model for a customer and make a prediction for the order
passed in with the prediction request.
* The prediction is marshalled to JSON and returned as a response from the web
request.

Dividing the application functionality on this line allowed us to use the right
tools for the job and to clearly separate the concerns of our app proper and the
prediction component.  In development environments, we can use a fake Prediction
Proxy within our app to return canned responses to prediction requests.  For
developers, at least, our app can still run as it always has -- as a single
process RoR application.

### More Hurdles
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
Here is where Docker and Linux containers came into the mix.  If you are not
familiar with these technologies, you might want to read more here for context.
To keep things brief, an oversimplified description is that they are a way to
bundle applications with their Linux runtime environment -- the packages,
software, libraries and resources needed for the application to do its job.
They run within their own process/user/filesystem sandbox on a host machine and
with their own network interface.  They are similar to a virtual machine, but
much lighter as it shares the host’s kernel.  Containers can be built from other
containers to cut down on the amount of repeated boilerplate.  Docker Hub makes
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
Docker-compose is used in development to manage dependencies for the main app.
This includes all middleware and the prediction application.  Our
docker-compose.yml file looks something like this (omitting things like ports,
volumes, environment vars, etc…).

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
  image: shippingeasy/autoship_predictor:1.1.2
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
12-factor app and lessens the time it takes to get a dev environment up and
running.

### Docker in Production
<img style="float: left; padding-right: 20px" src="{{ site.url }}/assets/images/mordor_meme.jpg"/>
Realizing the benefits of Docker in a production environment where you would
need to span multiple hosts is not as easy as development (me add
docker-compose.yml file to project, me smart).  There are many cloud and
self-managed options for this in various stages of development and readiness,
including Amazon Container Service, Google Container Engine, Kubernetes,
CoreOS/Fleet/Etcd, Docker Swarm, Deis, Flynn, Tapestry, Registrator and probably
others that have leaked out of my head since I last looked.

Unfortunately, at the time we decided to take all of this on, none of the above
efforts were ready for production use.  Everything was at a version less than
1.0.  Some still are.  If we were going to use Docker in production, we were
going to have to do some significant work ourselves.

We opted for a relatively simple solution, not wanting to invest too much into
how we hosted docker containers as we wanted to revisit later when some of the
major projects listed above had matured.  We let Haproxy’s load balancing and
health checks to do the heavy lifting for us.  We use Serf from Hashicorp (a
fine tool in its own right) to manage hosts entering and leaving the cluster.
Hosts are provisioned with Chef and do little other than install docker, ensure
host networking is set up correctly, and setup SSHD.   The topology of our
microservice infrastructure in production looks like this:

<img src="{{ site.url }}/assets/images/autoship_infrastructure.png"/>

* On predictor01, our primary host, we run an Haproxy load balancer container.
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
communicates via HTTP to predictor01 on port 80 (the haproxy loadbalancer).
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

