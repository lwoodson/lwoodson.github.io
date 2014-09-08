function stickyRelocate() {
  var windowTop = $(window).scrollTop();
  var divTop = $('#profile-anchor').offset().top;

  if (windowTop > divTop) {
    $('#profile').addClass('stickit');
  } else {
    $('#profile').removeClass('stickit')
  }
}

$(function() {
  $(window).scroll(stickyRelocate);
  stickyRelocate();
});
