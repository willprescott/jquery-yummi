(function($) {

  /**
     * Return the string between a given starting index and the next occurence of a text pattern
     *
     * @param {Number} index
     * @param {String} until
     * @param {Boolean} backwards
     * @returns {String}
     */
  String.prototype.substrUntil = function(index, until, backwards) {
    var string = [],
        regex = new RegExp(until, 'ig');
    if (backwards) {
      // reverse the caret direction, pretty much
      index--;
    }
    while (this.charAt(index)) {
      if (regex.test(this.charAt(index))) {
        break;
      }
      if (backwards) {
        string.unshift(this.charAt(index));
        index--;
      } else {
        string.push(this.charAt(index));
        index++;
      }
    }
    return string.join('');
  };

  /**
     * @returns {Number} The caret position
     */
  $.fn.caretPos = function() {
    var el = this.get(0),
        pos, sel;
    if (document.selection) {
      sel = document.selection.createRange().duplicate();
      sel.moveEnd('character', el.value.length);
      pos = el.value.lastIndexOf(sel.text);
    } else {
      pos = el.selectionStart;
    }
    return pos;
  };

  /**
     * Get the word at the current caret position
     *
     * @returns {String}
     */
  $.fn.wordAtCaret = function() {
    var value = this.val(),
        index = this.caretPos(),
        forward = value.substrUntil(index, ' '),
        backward = value.substrUntil(index, ' ', true);
    return backward + forward;
  };

  /**
     * http://stackoverflow.com/questions/499126/jquery-set-cursor-position-in-text-area
     *
     * @param {Number} pos
     */
  $.fn.setCursorPosition = function(pos) {
    var $el = $(this),
        range;
    if ($.isFunction($el.get(0).setSelectionRange)) {
      $el.get(0).setSelectionRange(pos, pos);
    } else if ($.isFunction($el.get(0).createTextRange)) {
      range = $el.get(0).createTextRange();
      range.collapse(true);
      range.moveEnd('character', pos);
      range.moveStart('character', pos);
      range.select();
    }
  };

  /**
     * @param {String} element
     * @param {Array} data
     * @param {Object} opts
     */
  $.yummi = function(element, data, opts) {
    var $element = $(element), $results, $sizer,
        defaults = {
          noResultsMessage: 'No matches found',
          separator: ' '
        },
        options = $.extend(defaults, opts),
        timeout;
    $element.data('yummi.collection', data);
    if ($element.data('yummi.active')) {
      // let the collection be updated and bail out
      return false;
    }

    // Private
    var KEY = {
      UP: 38,
      DOWN: 40,
      RIGHT: 39,
      LEFT: 37,
      TAB: 9,
      RETURN: 13,
      ESC: 27,
      SPACE: 32
    };

    function keyDownHandler(event) {
      switch (event.keyCode) {
        case KEY.UP:
          event.preventDefault();
          stepUp();
          break;
        case KEY.DOWN:
          event.preventDefault();
          stepDown();
          break;
        case KEY.TAB:
          if (focused().length) {
            focused().click();
            hideResults();
            clearFocus();
            event.preventDefault();
          }
          break;
        case KEY.RETURN:
          event.preventDefault();
          if ($element.val() === "") {
            $element.parents('form').trigger('submit');
          }
          if (focused().length) {
            focused().click();
            hideResults();
            clearFocus();
          }
          return;
          break;
        case KEY.ESC:
          hideResults();
          clearFocus();
          break;
        case KEY.SPACE:
          if (autoCompleting()) {
            hideResults();
            clearFocus();
          }
          break;
        case KEY.RIGHT:
        case KEY.LEFT:
          break; // do nothing
        default:
          clearTimeout(timeout);
          timeout = setTimeout(function() {
            suggestFor($element.wordAtCaret());
          }, 100);
          break;
      }
    }

    function suggestFor(text) {
      var regex, matches;
      if (text === '' || text === undefined) {
        return;
      }
      if ($results.find('> div').length) {
        $results.find('> div').remove();
      }
      regex = new RegExp('^' + text, 'ig');
      matches = $.grep($element.data('yummi.collection'), function(entry) {
        return regex.test(entry);
      });
      if (matches.length) { // results found
        if ($results.find('.result').length) {
          $results.find('.result').remove();
        }
        $.each(matches, function(index, match) {
          var $result = $('<div class="result">' + match + '</div>');
          $result
              .mouseover(function() {
                setFocus(this);
              })
              .click(function() {
                add($(this).text());
              });
          $results.append($result);
        });
      } else if (options.noResultsMessage) {
        $results.append('<div class="no_results">' + options.noResultsMessage + '</div>');
      } else {
        hideResults();
        return;
      }
      showResults();
    }

    function showResults() {
      if (!focused().length) {
        setFocus($results.find('.result:first'));
      }
      var prevText = $element.val().substring(0, $element.caretPos() - 1);
      $sizer.text(prevText);
      var textWidth = $sizer.outerWidth(true),
          resultsWidth = $results.outerWidth(true),
          elmWidth = $element.outerWidth(true),
          elmLeft = $element.offset().left;
      if ((textWidth + resultsWidth) > elmWidth) {
        $results.css("left", elmLeft + elmWidth - resultsWidth);
      } else {
        $results.css("left", elmLeft + textWidth);
      }
      $results.fadeIn('fast');
    }

    function hideResults() {
      $results.fadeOut('fast');
    }

    function clearFocus() {
      $results.find('.focused').removeClass('focused');
    }

    function focused() {
      return $results.find('.focused');
    }

    function autoCompleting() {
      return $results.is(':visible');
    }

    function setFocus(result) {
      if (focused().length) {
        clearFocus();
      }
      $(result).addClass('focused');
    }

    function stepUp() {
      if (!focused().prev().length) {
        return;
      }
      setFocus(focused().prev('.result'));
    }

    function stepDown() {
      if (!focused().length) {
        setFocus($results.find('.result:first'));
      } else if (!focused().next().length) {
      } else {
        setFocus(focused().next());
      }
    }

    function add(result) {
      var value = $element.val(),
          position = getCaretWordIndex();
      value = value.substr(0, position) + result + value.substr(position + $element.wordAtCaret().length);
      $element.val(value + options.separator);
      $element.setCursorPosition(value.length + options.separator.length);
    }

    function getCaretWordIndex() {
      return $element.caretPos() - $element.val().substrUntil($element.caretPos(), ' ', true).length;
    }

    function insertACResultsList() {
      var marginTop;
      $element.before('<span class="yummi-sizer"></span>'
          + '<div class="yummi-results"></div>');
      $results = $element.prev('.yummi-results');
      $sizer = $results.prev('.yummi-sizer');
      marginTop = parseInt($element.outerHeight(true)
          - parseFloat($element.css('margin-bottom')) - 1); // -1 so it appears slightly attached to the text field
      $results.css('margin-top', marginTop);
      // sizer element used only to calculate width of existing tags, properties need to match text input closely
      $sizer.css({
        'position': 'absolute',
        'left': '-9999px',
        'marginLeft': $element.css('marginLeft'),
        'borderLeftWidth': $element.css('borderLeftWidth'),
        'paddingLeft': $element.css('paddingLeft'),
        'fontFamily': $element.css('fontFamily'),
        'fontSize': $element.css('fontSize')
      });
    }

    insertACResultsList();
    $element
        .keydown(keyDownHandler)
        .blur(function() {
          hideResults();
          clearFocus();
        })
        .attr('autocomplete', 'off')
        .data('yummi.active', true);
  };

  /**
     * Initialise the Yummi autosuggest widget. Available option keys are:
     *
     *    noResultsMessage: {String|null} Pass your own string to localise message, null for no message at all, default: 'No matches found'
     *    separator: {String} A string to insert after each autocompleted word (e.g. a space or comma). Default: '' (empty string)
     *
     * @param {Object|Array} data Data should now be an array, but the legacy object type with a 'collection' key is still supported
     * @param {Object} opts An optional set of user preferences to override defaults
     */
  $.fn.yummi = function(data, opts) {
    // data collection is now explicitly required
    if (!data) {
      if (window.console && typeof window.console.error == 'function') {
          console.error('Yummi must be initialised with a data collection');
      }
      return;
    }
    // maintain compatibility with previous {collection: [data]} style data model
    var collection = typeof data === 'object' && !(data instanceof Array) && data.collection ? data.collection : data;
    return this.each(function() {
      $.yummi(this, collection, opts);
    });
  };

})(jQuery);
