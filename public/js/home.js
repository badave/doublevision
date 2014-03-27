$(document).ready(function() {
  var isMobile = (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/iPhone|iPad|iPod/i) || navigator.userAgent.match(/Opera Mini/i) || navigator.userAgent.match(/IEMobile/i));

  var save = function(e) {
    e.preventDefault();
    e.stopPropagation();

    // var type = $(e.currentTarget).data("type");
    var email = $("#email").val();

    $.ajax({
      type: "POST",
      url: "/v1/users",
      data: JSON.stringify({
        "email": email
      }),
      datatype: "json",
      contentType: "application/json",
      success: function(response) {
        $(".success").addClass("expand");

        $(".signup").css({ "opacity": "0", "display": "none" });
        mixpanel.track("signup success");
      },
      error: function(err) {
        if(err.responseJSON.data) {
          $(".ui.form").addClass("error");
          $(".email-error").find(".item").html('<i class="mail icon"></i> ' + err.responseJSON.data);
          $(".email-error").dropdown("show");
          $(".email-error .active").removeClass("active");
          mixpanel.track("signup error: " + err.responseJSON.data);
        }
      }
    });
  };

  $(".submit.button").on("click", save);
  $("form").on("submit", save);

  if(!isMobile) {
    var $window = $(window);
    var $skyline = $(".sf-skyline");
    var $words = $(".backdrop-words");

    var parallax = function() {
      var scrollTop = window.scrollY;
      if(scrollTop < 720) {
        var newY = (scrollTop - 200) / 7;
        // $skyline.css({ backgroundPosition: "0 " + newY + "px" });
        $skyline.css({ transform: "translate3d(0, " + newY + "px,0)"});

        var newYWords = 350 + scrollTop/3.5;
        var newOpacity = 1 - scrollTop/500.0;
        $words.css({ top: newYWords, opacity: newOpacity });
      }
    };

    $(window).scroll(parallax);

    $(document).on("touchmove", parallax);
    
    $(".ui.dropdown").dropdown();

  }

  $('a').click(function(){
      $('html, body').animate({
          scrollTop: $( $.attr(this, 'href') ).offset().top
      }, 500);
      return false;
  });

  $(".code-button").click(function() {
    $('.ui.modal')
      .modal('setting', 'transition', 'vertical flip')
      .modal('show')
    ;
  });
});
