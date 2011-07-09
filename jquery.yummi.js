(function($) {
  
  String.prototype.substrUntil = function(index, until, backwards) {
    var string = [],
        regex = new RegExp(until, 'ig');
    if (backwards) {
      // reverse the caret direction, pretty much
      index--; 
    }
    while(this.charAt(index)) {
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
  
  $.fn.wordAtCaret = function() {
    var value = this.val(),
        index = this.caretPos(),
        forward = value.substrUntil(index, ' '),
        backward = value.substrUntil(index, ' ', true);
    return backward + forward;
  };
  
  // http://stackoverflow.com/questions/499126/jquery-set-cursor-position-in-text-area
  $.fn.setCursorPosition = function(pos) {
    var el = $(this),
        range;
    if ($.isFunction(el.get(0).setSelectionRange)) {
      el.get(0).setSelectionRange(pos, pos);
    } else if ($.isFunction(el.get(0).createTextRange)) {
      range = el.get(0).createTextRange();
      range.collapse(true);
      range.moveEnd('character', pos);
      range.moveStart('character', pos);
      range.select();
    }
  };
  
  $.yummi = function(element, options) {
    var element = $(element),
        defaults = {collection: ['apple', 'carrot', 'banana', 'lemon', 'melon', 'onion', 'beetroot', 'orange']},
        options = $.extend(defaults, options),
        results, timeout;
    element.data('yummi.collection', (options.collection || defaults.collection));
    if (element.data('yummi.active')) {
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
      switch(event.keyCode) {
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
            add(focused().text());
            hideResults();
            clearFocus();
            event.preventDefault();
          };
          break;
        case KEY.RETURN:
          event.preventDefault();
          if (element.val() === "") {
            element.parents('form').trigger('submit');
          }
          if (focused().length) {
            add(focused().text());
            hideResults();
            clearFocus();
          }
          return false;
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
            suggestFor(element.wordAtCaret()); 
          }, 100);
          break;
      }
    };
    
    function suggestFor(text) {
      var regex, matches;
      if (text === '' || text === undefined) {
        return false;
      }
      if (results.find('> div').length) {
        results.find('> div').remove();
      }
      regex = new RegExp('^' + text, 'ig');
      matches = $.grep(element.data('yummi.collection'), function(entry) { 
                  return regex.test(entry); 
                });
      if (matches.length) { // results found
        if (results.find('.result').length) {
          results.find('.result').remove();
        }
        $.each(matches, function(index, match) {
          var result = $('<div class="result">' + match + '</div>');
          result
            .mouseover(function() {
              setFocus(this); 
            })
            .click(function() {
              add($(this).text()); 
            });
          results.append(result);
        });
      } else {
        results.append('<div class="no_results">No matches found</div>');
      }
      showResults();
    }
    
    function showResults() {
      if (!focused().length) {
        setFocus(results.find('.result:first'));
      }
      results.fadeIn('fast');
    }
    
    function hideResults() { 
      results.fadeOut('fast'); 
    }
    
    function clearFocus() { 
      results.find('.focused').removeClass('focused'); 
    }
    
    function focused() { 
      return results.find('.focused'); 
    }
    
    function autoCompleting() { 
      return results.is(':visible'); 
    }
    
    function setFocus(result) { 
      if (focused().length) {
        clearFocus();
      }
      $(result).addClass('focused');
    }
    
    function stepUp() {      
      if (!focused().prev().length) {
        return false;
      }
      setFocus(focused().prev('.result'));
    }
    
    function stepDown() {
      if (!focused().length) {
        setFocus(results.find('.result:first'));
      } else if (!focused().next().length) {
        return false;
      } else {
        setFocus(focused().next());
      }
    }
    
    function add(result) {
      var value = element.val(),
          position = getCaretWordIndex();
      value = value.substr(0, position) + result + value.substr(position + element.wordAtCaret().length);
      element.val(value);
      element.setCursorPosition(value.length);
    }
    
    function getCaretWordIndex() {    
      return element.caretPos() - element.val().substrUntil(element.caretPos(), ' ', true).length;
    }

    function insertACResultsList() {
      var marginTop;
      element.before('<div class="yummi-results"></div>');
      results = element.prev('.yummi-results');
      marginTop = parseInt(element.outerHeight(true)
          - parseFloat(element.css('margin-bottom')) - 1); // -1 so it appears slightly attached to the text field
      results.css('margin-top', marginTop);
    }
        
    insertACResultsList();
    element
      .keydown(keyDownHandler)
      .blur(function() { 
        hideResults(); clearFocus(); 
      })
      .attr('autocomplete', 'off')
      .data('yummi.active', true);
  };
    
  $.fn.yummi = function(options) { 
    return this.each(function() { 
      $.yummi(this, options); 
    }); 
  };
  
})(jQuery);
