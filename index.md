---
layout: default
title: Hello World!
tagline: Supporting tagline
---
{% include JB/setup %}

{% for post in site.posts %}
  <div class="panel panel-default">
    <div class="panel-heading"><h3>{{ post.title }}</h3></div>
    <div class="panel-body">{{ post.content }}</div>
  </div>
{% endfor %}
