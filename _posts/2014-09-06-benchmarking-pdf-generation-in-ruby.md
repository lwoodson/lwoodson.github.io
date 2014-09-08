---
layout: post
category: software
tagline: "This is a test"
tags : [ruby, jruby, java, pdf, prawn, performance]
---
At [ShippingEasy](http://shippingeasy.com/), we use the ruby
[Prawn gem](https://github.com/prawnpdf/prawn) to generate shipping label PDFs
for our customers.  This is where we make our money, and so having this be a
fast and pain-free experience is crucial to our business.  Prawn has generally
delivered finished PDFs well, but its performance has been not what we want.
So I have started looking into how we can speed up this process.  Here are
some early results of benchmarking some options including upgrading Ruby, pure
jRuby and jRuby invoking Java.

One thing I did early on was to just collect some basic benchmarking numbers
for Prawn and its rendering of images into PDFs.  There were 4 test groups:

1. Prawn with Ruby 2.0.0 (at the time our current setup)
1. Prawn with Ruby 2.1.2 (an upgrade we were undergoing)
1. Prawn with jRuby and JIT compilation (no code changes)
1. Prawn with jRuby delegating the PDF work to a Java class using [PDFBox](https://pdfbox.apache.org/)

The benchmark code used was
[Prawn's png_type_6.rb](https://github.com/prawnpdf/prawn/blob/master/bench/png_type_6.rb)
(or a java equivalent) and yielded some interesting results...

<table class="table table-striped table-bordered">
  <thead>
    <tr>
      <th>Components</th>
      <th>Time</th>
      <th>Speed Increase</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Ruby 2.0.0 + Prawn</td>
      <td>6.65s</td>
      <td></td>
    </tr>
    <tr>
      <td>Ruby 2.1.2 + Prawn</td>
      <td>5.10s</td>
      <td>130%</td>
    </tr>
    <tr>
      <td>jRuby 1.7.12 (JIT) + Prawn</td>
      <td>4.02s</td>
      <td>165%</td>
    </tr>
    <tr>
      <td>jRuby 1.7.12 + Java/PDFBox</td>
      <td>3.26s</td>
      <td>204%</td>
    </tr>
  </tbody>
</table>

My takeaways from this are:

1. Upgrade to ruby 2.1.2.  Performance boosts + no code change = win.
2. jRuby's JIT compilation option is no joke.  Your code interprets
to bytecode once and subsequent invocations run the compiled bytecode more
fast than MRI interprets ruby.
3. The interoperability between jRuby/Java is a nice feature.  I came up through
the java ranks, so being able to drop to it (instead of C) when needing to
go to a lower-level for performance is handy.

We have only upgraded to ruby 2.1.2 at this point, and I do not know if we'll
wind up doing anything else here.  Even so, its nice to know
we have additional options if we need to continue to improve performance in this
area.

For the Java/PDF box benchmark, I used the following code:

{% highlight ruby linenos %}
# encoding: utf-8

$LOAD_PATH.unshift(File.join(File.dirname(__FILE__), '..', 'lib'))
require "benchmark"
require 'java'
require 'target/javapdf-1.0-SNAPSHOT-jar-with-dependencies.jar'
java_import com.shippingeasy.javapdf.CreatePdf
pdf_creator = CreatePdf.new

N=100

Benchmark.bmbm do |x|
  x.report("PNG Type 6") do
    N.times do
      pdf_creator.generate
    end
  end
end
{% endhighlight %}

{% highlight java linenos %}
package com.shippingeasy.javapdf;

import java.io.File;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.edit.*;
import org.apache.pdfbox.pdmodel.graphics.xobject.*;

public class CreatePdf {
  public void generate() throws Exception {
    PDDocument doc = null;
    try {
      doc = new PDDocument();
      drawImage(doc);
      doc.save("dice.pdf");
    } finally {
      if (doc != null) {
        doc.close();
      }
    }
  }

  private void drawImage(PDDocument doc) throws Exception {
    PDPage page = new PDPage();
    doc.addPage(page);
    PDPageContentStream content = new PDPageContentStream(doc, page);
    content.drawImage(xImage(doc), 0, 0);
    content.close();
  }

  private PDXObjectImage xImage(PDDocument doc) throws Exception {
    BufferedImage img = ImageIO.read(new File("data/images/dice.png"));
    return new PDPixelMap(doc, img);
  }
}
{% endhighlight %}
