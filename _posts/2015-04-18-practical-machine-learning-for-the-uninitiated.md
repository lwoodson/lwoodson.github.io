---
layout: post
category: data
tagline: "Practical Machine Learning for the Uninitiated"
tags: [data science, machine learning]
---
<img style="float: left; padding-right: 20px" src="{{ site.url }}/assets/images/horror.gif"/>
Last fall when I [took on ShippingEasy’s machine learning problem](http://devquixote.com/data/2015/04/06/machine-learning-in-a-rails-app/), I had no
practical experience in the field.  Getting such a task put on my plate
was somewhat terrifying, and even more so as we started to wade into the waters
of machine learning.  Ultimately, we overcame those obstacles and [delivered a solution that allowed us to automate our customer's actions with greater than 95% accuracy](https://www.youtube.com/watch?v=b49OJZlMEgo).
Here are some of the challenges that we experienced when applying machine learning
to the shipping & fulfilment domain, and how we broke through them.

### Lost in Translation
> Machine learning is a subfield of computer science stemming from research into artificial intelligence.[3] It has strong ties to statistics and mathematical optimization, which deliver methods, theory and application domains to the field.

[So sayeth the Wikipedia](http://en.wikipedia.org/wiki/Machine_learning).
These roots are where the lexicon of the machine learning stems
from.  If you have not been working directly in machine learning, statistics,
math or AI, or perhaps your exposure to these are long past, a discussion about
machine learning will be hard to follow.  Often it is taken for granted that you
know what classification, regression, clustering, supervised, unsupervised, feature
vector, sample, over-fitting, binning, banding, density and a host of other terms mean.

<img style="float: right; padding-left: 20px" src="{{ site.url }}/assets/images/no_comprende.jpeg"/>
As a result, you will be somewhat lost until you can get familiar with this
language.  Getting a good book will help.  I would recommend
[Machine Learning, a short course](http://amlbook.com/).  It clocks in at less
than 200 pages, and so is something that a working professional can consume.
Even if you can’t follow everything in the book, reading through it will
give you a foundation that will allow you to make use of all the other resources
you may find online.

To give you a starting point to building your vocabulary, I will offer a few
terms here that will help determine what type of machine learning problem you
are dealing with.

**Supervised vs Unsupervised Learning**:  [Supervised learning](http://en.wikipedia.org/wiki/Supervised_learning)
is where you have a set of input data with known outcomes by which you wish to predict the outcome of
future inputs.  Our problem at [ShippingEasy](http://shippingeasy.com/)
was of this type. We had past orders and shipments and needed to predict
shipments given future orders.  [Unsupervised learning](http://en.wikipedia.org/wiki/Unsupervised_learning)
is where you have input data, but no known outcomes.  You are searching for what features have meaning
within a set of data.  If graphed, the data will form clusters around the
patterns of meaningful features.

**Classification vs Regression**: Within supervised learning, there are problems of
classification and regression.  [Classification](http://en.wikipedia.org/wiki/Statistical_classification)
is where you wish to determine the class (output) of an input.   For instance,
predicting what shirt color a person may wear on a given day based on data about
what shirts they have worn in the past.  The different shirt colors are the
classes that you are attempting to predict.

[Regression](http://en.wikipedia.org/wiki/Regression_analysis) is where you
wish to determine a numeric value given other numeric inputs
describing the sample.  For instance, predicting an engineer's salary based on age
and years in the industry.  Given enough past data, you could arrive at a statistically
relevant salary figure given an arbitrary age and years in the industry (assuming
true relationships between age, years in industry and salary).

### Algorithmic Obsession
<img style="float: left; padding-right: 20px" src="{{ site.url }}/assets/images/minblown.gif"/>
Once you have a foundation of concepts and language, you can start looking into
all of the amazing resources on the web for machine learning.
[Stanford’s machine learning videos](http://www.youtube.com/watch?v=5u4G23_OohI)
are great, as are
[mathematicalmonk’s youtube videos](http://www.youtube.com/watch?v=8yvBqhm92xA).

These are fantastic resources for learning how to write machine learning
algorithms.  But these turned out to not be of much use to me.  Not because they
are not great, but because **the practical application of machine learning is
about solving a domain problem, not writing machine
learning algorithms**.  To make the point, consider this portion of a machine
learning algorithm expressed in mathematical notation (which is yet another
barrier to the uninitiated):


<img style="float: right; padding-left: 20px" src="{{ site.url }}/assets/images/naive_bayes.png"/>
What does this have to do with the problem you are trying to solve?  Absolutely
nothing.  This is a description of one portion of an algorithm that may be fed
arbitrary data to produce statistically relevant results.  It has been implemented
by someone smarter than you
[in an open source library](http://scikit-learn.org/stable/) or possibly [a service
offering](https://aws.amazon.com/de/blogs/aws/amazon-machine-learning-make-data-driven-decisions-at-scale/)
that have been well exercised by a large audience.
You could implement it perfectly, and it could produce great results or really
bad results.  It all depends on the relevancy of the data you feed to it, which brings
me to my last point.

### Its the Data, Stupid
While there are a tremendous number of resources for how to write machine
learning algorithms, there are not many dealing with how to find relevant
data within a domain that will allow an algorithm to produce accurate results.
This is where you will find that you have spent most of your time, effort and
creativity at the end of an applied machine learning project if you were smart
enough to use a good machine learning library or service.

<img style="float: left; padding-right: 20px" src="{{ site.url }}/assets/images/its_the_data.jpg"/>
That algorithms dominate the resources for machine learning makes a certain
amount of sense.  Algorithms are
generic and have practicability for many different scenarios.  The
[K-Nearest Neighbor](http://en.wikipedia.org/wiki/K-nearest_neighbors_algorithm)
algorithm may be able to predict what movies you would
like to watch on Netflix, or it might be able to predict which sex offenders are
at high risk for recidivism. These different applications of K-Nearest neighbor
would have very different data that needs to be surfaced from their respective
domains and fed to them, however.

There exists [an area of machine learning geared towards feature detection](http://en.wikipedia.org/wiki/Feature_learning),
and I won't dismiss its validity.  I will say, however, that if someone
understands the domains of movie consumption and purchasing dynamics or
criminal behavior, justice and rehabilitation, they have a leg up in practically
applying machine learning to those domains.  For even if there is a statistical
correlation between day of the week and movie choices, it does not mean
that there is a causative relationship between them.  Understanding the
domain can help you ascertain if it does.

Some of the data will be obvious.  It winds up being a value in a column of a
row in the database and it screams its pertinence.  Some will be much less
obvious and need to be inferred.  For instance, for the sex offender
recidivism problem, there are probably a number of criminal incidents, each
with a timestamp for when they occurred.  For any given person, the amount
of time that has passed since their last criminal event, in days, might need
to be calculated and included with the data sent to the algorithm.  This
'freshness' of their criminal activity needs to be inferred from your data,
and it may be a key to getting the desired results in predicting future likelihood
of behavior.  Or it might not.

I think the moral of the story here is that to really apply machine learning in
a practical way, being a mathematical or statistical wizard is not the most
important element of success.  What I feel is more important is having an
understanding of the domain to know what data is relevant and an explorers curiosity
to have meaningful hunches and a willingness to explore and vet them.  You will
need to be comfortable employing something resembling a scientific method --
ensuring accuracy is measurable, quantifying the effects of change, and 
meticulously exploring isolated changes to discover what data affects a system.

### In conclusion
<img style="float: right; padding-left: 20px" src="{{ site.url }}/assets/images/not_a_data_scientist.jpg"/>
Employing machine learning to solve domain problems can provide huge value
to a company or the public at large.  Learning machine learning and how to
properly apply it to a domain, however, can be challenging.  You will need
to develop a knowledge of the fundamentals of machine learning, but do not
need to be a computer science, math or statistics guru to employ it.  Leverage
existing libs or services, and then focus your efforts on finding the meaningful
data within the domain, both obvious and obscure, that will allow satisfactory
results to  be achieved.
