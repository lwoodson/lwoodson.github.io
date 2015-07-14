---
layout: post
category: devops
tagline: 'Docker Fueled Microservices (Part 1)'
tags: [devops, engineering]
description: Decisions, hurdles and thoughts after delivering a Microservice deployed with Docker
thumbnail: /assets/images/burgundy_meme.jpg
---
When [bringing machine learning to ShippingEasy](http://devquixote.com/data/2015/04/18/practical-machine-learning-for-the-uninitiated/)
last year, decisions were
made to implement the predictive aspects in Python, to make it a microservice,
and to deploy it in all environments using Docker containers.  This is the first
of [two posts](/devops/2015/07/15/docker-fueled-microservices-part-2/) detailing the the thinking behind these decisions, hurdles, and
some thoughts on microservices and Linux containers in light of the experience.

### The Problem and its Solution
<img style="float: left; padding-right: 20px" src="{{ site.url }}/assets/images/chappelle_meme.jpg"/>
I’ve detailed the problem elsewhere, so I won’t spend too much time expanding on
it here.  We needed to use machine learning algorithms to predict how our
customers would ship their orders given a historical set of their orders and how
they were shipped.  Ruby is an amazing, elegant language and Rails is an great
tool for bootstrapping a product and getting to market.  But neither are tools
for scientific computing.  Hardly anything exists in the machine learning realm,
and what does is not mature with a large community of experts behind it.

The opposite is true of Python, however.  It is widely used for scientific
computing and has a great machine learning library in SciKit learn.  It proved
itself through investigation into our problem, providing good results in a
proof-of-concept.  Python and SciKit Learn were the right tools for the job and
gave us a solution to our domain problem.

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
[Martin Fowler](https://twitter.com/martinfowler?lang=en) and others at
[ThoughtWorks](https://twitter.com/thoughtworks?lang=en) have organized their
observations of how large tech organizations manage disparate teams working with
different technologies to be at least the sum of their parts.  They call their thoughts
[Microservices](http://martinfowler.com/articles/microservices.html).  I wish
they had chosen a different name, simply because
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
problem.  There was no way we were going to remain solely a Rails application if
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
* The proxy is what actually talks to the Python microservice application.  It
takes the order, marshalls it to JSON, makes the web request of the
microservice, unmarshalls the response and hands it back to the service.
* The PredictionService takes the prediction, validates the data, builds a
Prediction object in the main application and persists it associated with the order.
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
process Rails application.  So far, so good.

The oft-cited downsides to microservices were about to rear their head, however.
Part 2 in this series will detail how Docker and Linux Containers helped
remedy them.  [Click here to continue on...](/devops/2015/07/15/docker-fueled-microservices-part-2/)
