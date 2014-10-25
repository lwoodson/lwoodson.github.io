---
layout: default
title: Dev Quiote - Charging digital windmills since, oh, forever
tagline: Supporting tagline
---
{% include JB/setup %}

{% for post in site.posts %}
  <div class="panel panel-default">
    <div class="panel-heading">
      <h3>
          <a href="{{ post.url }}">
            {{ post.title }}
          </a>
      </h3>
    </div>
    <div class="panel-body">{{ post.content }}</div>
  </div>
{% endfor %}
