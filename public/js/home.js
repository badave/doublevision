$(document).ready(function() {
  (function(i){var e=/iPhone/i,n=/iPod/i,o=/iPad/i,t=/(?=.*\bAndroid\b)(?=.*\bMobile\b)/i,r=/Android/i,d=/BlackBerry/i,s=/Opera Mini/i,a=/IEMobile/i,b=/(?=.*\bFirefox\b)(?=.*\bMobile\b)/i,h=RegExp("(?:Nexus 7|BNTV250|Kindle Fire|Silk|GT-P1000)","i"),c=function(i,e){return i.test(e)},l=function(i){var l=i||navigator.userAgent;this.apple={phone:c(e,l),ipod:c(n,l),tablet:c(o,l),device:c(e,l)||c(n,l)||c(o,l)},this.android={phone:c(t,l),tablet:!c(t,l)&&c(r,l),device:c(t,l)||c(r,l)},this.other={blackberry:c(d,l),opera:c(s,l),windows:c(a,l),firefox:c(b,l),device:c(d,l)||c(s,l)||c(a,l)||c(b,l)},this.seven_inch=c(h,l),this.any=this.apple.device||this.android.device||this.other.device||this.seven_inch},v=i.isMobile=new l;v.Class=l})(window);

  var save = function(e) {
    e.preventDefault();
    e.stopPropagation();

    // var type = $(e.currentTarget).data("type");
    var email = $("#email").val();

    var type = $(".type-of-user").dropdown("get").value() || "interested";

    $.ajax({
      type: "POST",
      url: "/v1/users",
      data: JSON.stringify({
        "email": email,
        "type": type
      }),
      datatype: "json",
      contentType: "application/json",
      success: function(response) {
        $(".success").addClass("expand");

        // $(".count").text(response.data.id);
        $(".waitlist_number").text(response.data.waitlist_number);
        // $(".type-of-donor").text(type);

        $(".signup-related").css({ "opacity": "0", "display": "none" });
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

  // if(!isMobile.apple.phone) {
    var $window = $(window);
    var $skyline = $(".sf-skyline");
    var $words = $(".backdrop-words");

    var parallax = function() {
      var scrollTop = window.scrollY;
      var newY = (scrollTop - 200) / 7;
      // $skyline.css({ backgroundPosition: "0 " + newY + "px" });
      $skyline.css({ transform: "translate3d(0, " + newY + "px,0)"});

      var newYWords = 300 + scrollTop/3.5;
      var newOpacity = 1 - scrollTop/500.0;
      $words.css({ top: newYWords, opacity: newOpacity });
    };

    $(window).scroll(parallax);

    $(document).on("touchmove", parallax);
    
    $(".ui.dropdown").dropdown();

  // }
});
