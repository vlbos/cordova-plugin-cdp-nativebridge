/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

'use strict';

// [CDP modified]: detect document object
function getDocument() {
    if (null != window.parent) {
        return document.getElementsByTagName('iframe')[0].contentWindow.document;
    } else {
        return document;
    }
}

/******************************************************************************/

function getMode(callback) {
  var mode = localStorage.getItem('cdvtests-mode') || 'main';
  callback(mode);
}

function setMode(mode) {
  var handlers = {
    'main': runMain,
    'auto': runAutoTests,
    'manual': runManualTests
  };
  if (!handlers.hasOwnProperty(mode)) {
    console.error("Unsupported mode: " + mode);
    console.error("Defaulting to 'main'");
    mode = 'main';
  }

  localStorage.setItem('cdvtests-mode', mode);
  clearContent();

  handlers[mode]();
}

/******************************************************************************/

function clearContent() {
  var content = getDocument().getElementById('content');
  content.innerHTML = '';
  var log = getDocument().getElementById('log--content');
  log.innerHTML = '';
  var buttons = getDocument().getElementById('buttons');
  buttons.innerHTML = '';

  setLogVisibility(false);
}

/******************************************************************************/

function setTitle(title) {
  var el = getDocument().getElementById('title');
  el.textContent = title;
}

/******************************************************************************/

function setLogVisibility(visible) {
  if (visible) {
    getDocument().getElementById('log').classList.add('expanded');
  } else {
    getDocument().getElementById('log').classList.remove('expanded');
  }
}

function toggleLogVisibility() {
  var log = getDocument().getElementById('log');
  if (log.classList.contains('expanded')) {
    log.classList.remove('expanded');
  } else {
    log.classList.add('expanded');
  }
}

/******************************************************************************/

function attachEvents() {
  getDocument().getElementById('log--title').addEventListener('click', toggleLogVisibility);
}

/******************************************************************************/

var origConsole = window.console;

exports.wrapConsole = function() {
  function appendToOnscreenLog(type, args) {
    var el = getDocument().getElementById('log--content');
    var div = getDocument().createElement('div');
    div.classList.add('log--content--line');
    div.classList.add('log--content--line--' + type);
    div.textContent = Array.prototype.slice.apply(args).map(function(arg) {
        return (typeof arg === 'string') ? arg : JSON.stringify(arg);
      }).join(' ');
    el.appendChild(div);
    // scroll to bottom
    el.scrollTop = el.scrollHeight;
  }

  function createCustomLogger(type) {
    // [CDP modified] change plugin id.
    var medic = require('com.sony.cdp.plugin.test-framework.medic');
    return function() {
      origConsole[type].apply(origConsole, arguments);
      // TODO: encode log type somehow for medic logs?
      medic.log.apply(medic, arguments);
      appendToOnscreenLog(type, arguments);
      setLogVisibility(true);
    };
  }

  window.console = {
    log: createCustomLogger('log'),
    warn: createCustomLogger('warn'),
    error: createCustomLogger('error'),
  };
};

exports.unwrapConsole = function() {
  window.console = origConsole;
};

/******************************************************************************/

function createActionButton(title, callback, appendTo) {
  appendTo = appendTo ? appendTo : 'buttons';
  var buttons = getDocument().getElementById(appendTo);
  var div = getDocument().createElement('div');
  var button = getDocument().createElement('a');
  button.textContent = title;
  button.onclick = function(e) {
    e.preventDefault();
    callback();
  };
  button.classList.add('topcoat-button');
  div.appendChild(button);
  buttons.appendChild(div);
}

/******************************************************************************/

function setupAutoTestsEnablers(cdvtests) {
  var enablerList = createEnablerList();

  // Iterate over all the registered test modules
  iterateAutoTests(cdvtests, function(api, testModule) {
    // For "standard" plugins remove the common/repetitive bits of
    // the api key, for use as the title.  For third-party plugins, the full
    // api will be used as the title
    var title = api.replace(/org\.apache\.cordova\./i, '').replace(/\.tests.tests/i, '');

    createEnablerCheckbox(api, title, testModule.getEnabled(), enablerList.id, toggleTestHandler);
  });

  updateEnabledTestCount();
}

/******************************************************************************/

function createEnablerList() {
  var buttons = getDocument().getElementById('buttons');

  var enablerContainer = getDocument().createElement('div');
  enablerContainer.id = 'test-enablers-container';

  // Create header to show count of enabled/total tests
  var header = getDocument().createElement('h3');
  header.id = 'tests-enabled';

  // Create widget to show/hide list
  var expander = getDocument().createElement('span');
  expander.id = 'test-expander';
  expander.innerText = 'Show/hide tests to be run';
  expander.onclick = toggleEnablerVisibility;

  // Create list to contain checkboxes for each test
  var enablerList = getDocument().createElement('div');
  enablerList.id = "test-list";

  // Create select/deselect all buttons (in button bar)
  var checkButtonBar = getDocument().createElement('ul');
  checkButtonBar.classList.add('topcoat-button-bar');

  function createSelectToggleButton(title, selected) {
    var barItem = getDocument().createElement('li');
    barItem.classList.add('topcoat-button-bar__item');

    var link = getDocument().createElement('a');
    link.classList.add('topcoat-button-bar__button');
    link.innerText = title;
    link.href = null;
    link.onclick = function(e) {
      e.preventDefault();
      toggleSelected(enablerList.id, selected);
      return false;
    };

    barItem.appendChild(link);
    checkButtonBar.appendChild(barItem);
  };
  createSelectToggleButton('Check all', true);
  createSelectToggleButton('Uncheck all', false);
  enablerList.appendChild(checkButtonBar);

  enablerContainer.appendChild(header);
  enablerContainer.appendChild(expander);
  enablerContainer.appendChild(enablerList);

  buttons.appendChild(enablerContainer);

  return enablerList;
}

/******************************************************************************/

function updateEnabledTestCount() {
  var enabledLabel = getDocument().getElementById('tests-enabled');

  // Determine how many tests are currently enabled
  // [CDP modified] change plugin id.
  var cdvtests = cordova.require('com.sony.cdp.plugin.test-framework.cdvtests');
  var total = 0;
  var enabled = 0;
  iterateAutoTests(cdvtests, function(api, testModule) {
    total++;
    if (testModule.getEnabled()) {
      enabled++;
    }
  });

  if (enabled == total) {
    enabledLabel.innerText = 'Running All Tests.';
  } else {
    enabledLabel.innerText = 'Running ' + enabled + ' of ' + total + ' Tests.';
  }
}

/******************************************************************************/

function toggleSelected(containerId, newCheckedValue) {
  [].forEach.call(getDocument().getElementById(containerId).getElementsByTagName('input'), function(input) {
    if (input.type !== 'checkbox') return;
    input.checked = newCheckedValue;
    toggleTestEnabled(input);
  });
  updateEnabledTestCount();
}

/******************************************************************************/

function toggleEnablerVisibility() {
  var enablerList = getDocument().getElementById('test-list');
  if (enablerList.classList.contains('expanded')) {
    enablerList.classList.remove('expanded');
  } else {
    enablerList.classList.add('expanded');
  }
}

/******************************************************************************/

function createEnablerCheckbox(api, title, isEnabled, appendTo, callback) {
  var container = getDocument().getElementById(appendTo);

  var label = getDocument().createElement('label');
  label.classList.add('topcoat-checkbox');

  var checkbox = getDocument().createElement('input');
  checkbox.type = "checkbox";
  checkbox.value = api;
  checkbox.checked = isEnabled;
  label.htmlFor = checkbox.id = 'enable_' + api;

  checkbox.onchange = function(e) {
    e.preventDefault();
    callback(e);
  };

  var div = getDocument().createElement('div');
  div.classList.add('topcoat-checkbox__checkmark');

  var text = getDocument().createElement('span');
  text.innerText = title;

  label.appendChild(checkbox);
  label.appendChild(div);
  label.appendChild(text);

  container.appendChild(label);
}

/******************************************************************************/

function toggleTestHandler(event) {
  var checkbox = event.target;

  toggleTestEnabled(checkbox);
  updateEnabledTestCount();
}

/******************************************************************************/

function toggleTestEnabled(checkbox) {
  // [CDP modified] change plugin id.
  var cdvtests = cordova.require('com.sony.cdp.plugin.test-framework.cdvtests');
  cdvtests.tests[checkbox.value].setEnabled(checkbox.checked);
}

/******************************************************************************/

function iterateAutoTests(cdvtests, callback) {
  Object.keys(cdvtests.tests).forEach(function(api) {
    var testModule = cdvtests.tests[api];
    if (!testModule.hasOwnProperty('defineAutoTests')) {
      return;
    }
    callback(api, testModule);
  });
}

/******************************************************************************/

function runAutoTests() {
  setTitle('Auto Tests');

  createActionButton('Run', setMode.bind(null, 'auto'));
  createActionButton('Reset App', location.reload.bind(location));
  createActionButton('Back', setMode.bind(null, 'main'));

  // [CDP modified] change plugin id.
  var cdvtests = cordova.require('com.sony.cdp.plugin.test-framework.cdvtests');
  cdvtests.init();
  setupAutoTestsEnablers(cdvtests);

  cdvtests.defineAutoTests();

  // Run the tests!
  var jasmineEnv = window.jasmine.getEnv();

  jasmineEnv.execute();
}

/******************************************************************************/

function runManualTests() {
  setTitle('Manual Tests');

  createActionButton('Reset App', location.reload.bind(location));
  createActionButton('Back', setMode.bind(null, 'main'));

  var contentEl = getDocument().getElementById('content');
  var beforeEach = function(title) {
    clearContent();
    setTitle(title || 'Manual Tests');
    createActionButton('Reset App', location.reload.bind(location));
    createActionButton('Back', setMode.bind(null, 'manual'));
  };
  // [CDP modified] change plugin id.
  var cdvtests = cordova.require('com.sony.cdp.plugin.test-framework.cdvtests');
  cdvtests.defineManualTests(contentEl, beforeEach, createActionButton);
}

/******************************************************************************/

function runMain() {
  setTitle('Apache Cordova Plugin Tests');

  createActionButton('Auto Tests', setMode.bind(null, 'auto'));
  createActionButton('Manual Tests', setMode.bind(null, 'manual'));
  createActionButton('Reset App', location.reload.bind(location));
  if (/showBack/.exec(location.hash)) {
      createActionButton('Back', function() {
          history.go(-1);
      });
  }

  if (cordova.platformId === "windows" || cordova.platformId === "windows8") {
    var app = WinJS.Application;
    app.addEventListener("error", function (err) {
        // We do not want an unhandled exception to crash the test app
        // Retruning true marks it as being handled
        return true;
      });
  }
}

/******************************************************************************/

exports.init = function() {
  // TODO: have a way to opt-out of console wrapping in case line numbers are important.
  // ...Or find a custom way to print line numbers using stack or something.
  // make sure to always wrap when using medic.
  attachEvents();
  exports.wrapConsole();

  // [CDP modified] change plugin id.
  var medic = require('com.sony.cdp.plugin.test-framework.medic');
  medic.load(function() {
    if (medic.enabled) {
      setMode('auto');
    } else {
      getMode(setMode);
    }
  });
};

/******************************************************************************/
