var showCompletion = function(){
  alert('GREAT! YOU SOLVE IT!!!');
}


var expect = chai.expect;
var assert = chai.assert;


function runUserCode(){
  $('.nav-tabs li:eq(1) a').trigger('click');

  isInitRun = false;
  bonfireExecute(true);
}


// obtaining absolute path of this script

var editor;
$(function(){
  editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineWrapping: true,
    lineNumbers: true,
    viewportMargin: Infinity,
    extraKeys: {"Ctrl-Space": "autocomplete",
    'Ctrl-Enter': function() {
        runUserCode();
        return false;
      }},
    theme: 'monokai',
    mode: {name: "javascript"/*, globalVars: true*/},
    gutters: ["CodeMirror-lint-markers"],
    lint: true
  });
  editor.setValue(defaultCode);

  editor.setSize('100%', '100%');
});

var codeOutput;

$(function(){
  codeOutput = CodeMirror.fromTextArea( document.getElementById('codeOutput'),
   {
     lineNumbers: false,
     mode: 'text',
     theme: 'monokai',
     readOnly: 'nocursor',
     lineWrapping: true
   }
  );

  codeOutput.setValue(
   '/**\n' +
   ' * Your output will go here.\n' +
   ' * Console.log() -type statements\n' +
   ' * will appear in your browser\'s\n' +
   ' * DevTools JavaScript console.\n' +
   ' */'
  );

  //codeOutput.setSize('100%', 'auto');
});



function removeComments(userJavaScript) {
  var regex = new RegExp(/(\/\*[^(\*\/)]*\*\/)|\/\/[^\n]*/g);
  return userJavaScript.replace(regex, '');
}


function removeLogs(userJavaScript) {
  return userJavaScript.replace(/(console\.[\w]+\s*\(.*\;)/g, '');
}





var BDDregex = new RegExp(
  '(expect(\\s+)?\\(.*\\;)|' +
  '(assert(\\s+)?\\(.*\\;)|' +
  '(assert\\.\\w.*\\;)|' +
  '(.*\\.should\\..*\\;)/'
);


var scrapeTests = function(userJavaScript) {

  // insert tests from mongo
  for (var i = 0; i < tests.length; i++) {
    userJavaScript += '\n' + tests[i];
  }

  var counter = 0;
  var match = BDDregex.exec(userJavaScript);

  while (match) {
    var replacement = '//' + counter + testSalt;
    userJavaScript = userJavaScript.substring(0, match.index) +
      replacement +
      userJavaScript.substring(match.index + match[0].length);

      if (!userTests) {
        userTests = [];
      }

      userTests.push({
        'text': match[0],
        'line': counter,
        'err': null
      });

      counter++;
      match = BDDregex.exec(userJavaScript);
    }
    return userJavaScript;
  };

  var attempts = 0;

  function bonfireExecute(shouldTest) {
    initPreview = false;
    goodTests = 0;
    attempts++;
    //ga('send', 'event', 'Challenge', 'ran-code', common.challengeName);
    userTests = null;
    $('#testSuite').empty();
    var userJavaScript = editor.getValue();
    var failedCommentTest = false;

    // checks if the number of opening comments(/*) matches the number of
    // closing comments(*/)
    if (
      userJavaScript.match(/\/\*/gi) &&
      (!userJavaScript.match(/\*\//gi) || userJavaScript.match(/\/\*/gi).length > userJavaScript.match(/\*\//gi).length)
    ) {
      failedCommentTest = true;
    }

    userJavaScript = removeComments(userJavaScript);
    userJavaScript = scrapeTests(userJavaScript);
    // simple fix in case the user forgets to invoke their function

    if (userJavaScript.match(/function/gi)) {
      if (userJavaScript.match(/function\s*?\(|function\s+\w+\s*?\(/gi)) {
        sandBox.submit(userJavaScript, function(cls, message) {
          if (failedCommentTest) {
            editor.setValue(editor.getValue() + '*/');
            console.log('Caught Unfinished Comment');
            codeOutput.setValue('Unfinished multi-line comment');
            failedCommentTest = false;
          } else if (cls) {
            codeOutput.setValue(message.error);
            if (shouldTest) {
              runTests('Error', null);
            }
          } else {
            codeOutput.setValue(message.output);
            codeOutput.setValue(codeOutput.getValue().replace(/\\\"/gi, ''));
            message.input = removeLogs(message.input);
            if (shouldTest) {
              runTests(null, message);
            }
          }
        });
      } else {
        codeOutput.setValue('Unsafe or unfinished function declaration');
      }
    } else {
      sandBox.submit(userJavaScript, function(cls, message) {


        if (failedCommentTest) {
          editor.setValue(editor.getValue() + '*/');
          console.log('Caught Unfinished Comment');
          codeOutput.setValue('Unfinished mulit-line comment');
          failedCommentTest = false;
        } else if (cls) {
          codeOutput.setValue(message.error);
          if (shouldTest) {
            runTests('Error', null);
          }
        } else {
          // todfo esto es la salida!
          codeOutput.setValue(message.output);
          codeOutput.setValue(codeOutput.getValue().replace(/\\\"/gi, ''));
          message.input = removeLogs(message.input);

          if (shouldTest) {
            runTests(null, message);
          }
        }
      });
    }


  }


  var reassembleTest = function(test, data) {
    var lineNum = test.line;
    var regexp = new RegExp('\/\/' + lineNum + testSalt);
    return data.input.replace(regexp, test.text);
  };

  var runTests = function(err, data) {
    var editorValue = editor.getValue();
    // userTests = userTests ? null : [];
    var allTestsPassed = true;
    pushed = false;
    $('#testSuite').children().remove();
    if (err && userTests.length > 0) {
      userTests = [{
        text: 'Program Execution Failure',
        err: 'No user tests were run.'
      }];
      createTestDisplay();

    // Add blocks to test exploits here!
    } else if (editorValue.match(/if\s\(null\)\sconsole\.log\(1\);/gi)) {
      allTestsPassed = false;
      userTests = [{
        text: 'Program Execution Failure',
        err: 'Invalid if (null) console.log(1); detected'
      }];
      createTestDisplay();
    } else if (userTests) {
      userTests.push(false);
      pushed = true;
      userTests.forEach(function(
        chaiTestFromJSON,
        indexOfTestArray,
        __testArray
      ) {
        try {
          if (chaiTestFromJSON) {
            //console.log(reassembleTest(chaiTestFromJSON, data));
            /* eslint-disable no-eval, no-unused-vars */
            var output = eval(reassembleTest(chaiTestFromJSON, data));
            /* eslint-enable no-eval, no-unused-vars */
            //codeOutput.setValue(output);
          }
        } catch (error) {
          allTestsPassed = false;
          __testArray[indexOfTestArray].err = error.message;
        } finally {
          if (!chaiTestFromJSON) {
            createTestDisplay();
          }
        }
      });

      if (allTestsPassed) {
        allTestsPassed = false;
        showCompletion();
      } else {
        isInitRun = false;
      }
    }
  };

  var createTestDisplay = function() {
    if (pushed) {
      userTests.pop();
    }

    $('#testSuite').html('<div class="row"><div class="col-xs-12"><h3>Test cases:</h3></div></div>');

    var _outputErrors='';

    for (var i = 0; i < userTests.length; i++) {

      var didTestPass = !userTests[i].err;
      var testText = userTests[i].text
        .split('message: ')
        .pop()
        .replace(/\'\);/g, '');

      if(!didTestPass){
        _outputErrors += '\n\n' + userTests[i].err;
      }

      var iconClass = didTestPass ?
        '"glyphicon glyphicon-ok text-success"' :
        '"glyphicon glyphicon-remove text-danger"';

      $("<div class='row' style='    border-bottom: 2px solid #ccc;padding-bottom: 2px;margin-bottom: 2px;'><div class='col-xs-2 text-center'><i style='font-size: 18px;' class=" +
        iconClass +
        "></i></div><div class='col-xs-10 test-output'>" +
        testText +
        "</div></div>"
      )
      .appendTo($('#testSuite'));
    }

    if(_outputErrors){
      codeOutput.setValue(codeOutput.getValue() +"\n\n******************\nTEST ERROR OUTPUT:"+ _outputErrors);
    }


  };
