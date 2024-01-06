//! This file contains handling of unsupported browsers.
//! Do NOT use modern Javascript features in this file

var msEdgeVersion = navigator.userAgent.match(/(Edge)\/(\d+)(?:\.(\d+))?/);
var chromiumVersion = navigator.userAgent.match(/(Chromium|Chrome)\/(\d+)\.(\d+)(?:\.(\d+))?/);
var firefoxVersion = navigator.userAgent.match(/(Firefox)\/(\d+)\.(\d+)/);
var safariVersion = navigator.userAgent.match(/(Version)\/(\d+)\.(\d+)(?:\.(\d+))?.*Safari\//);

var firefoxLink = '<a href="https://www.mozilla.org/eo/firefox/">Mozilla Firefox</a>';
var googleLink = '<a href="https://www.google.com/chrome/">Google Chrome</a>';

var isSupported = false;
var updateLink = '';
var browserName = 'Nekonata retumilo';
var extraMessage = '';

var minVersion = '';

var browserTargets = {
    // >1% on 2022-06-12
    chrome: '97',
    firefox: '96',
    safari: '14',
};

if (msEdgeVersion) {
    minVersion = 19;
    isSupported = +msEdgeVersion[2] >= minVersion;
    browserName = 'Microsoft Edge ' + msEdgeVersion[2];
}

if (msEdgeVersion && !isSupported) {
    // we do this so that newer edge falls through to chrome
} else if (chromiumVersion) {
    minVersion = +browserTargets.chrome;
    isSupported = +chromiumVersion[2] >= minVersion;
    browserName = chromiumVersion[1] + ' ' + chromiumVersion[2];
    updateLink = googleLink;
} else if (firefoxVersion) {
    minVersion = +browserTargets.firefox;
    isSupported = +firefoxVersion[2] >= minVersion;
    browserName = firefoxVersion[1] + ' ' + firefoxVersion[2];
    updateLink = firefoxLink;
} else if (safariVersion) {
    minVersion = +browserTargets.safari;
    isSupported = +safariVersion[2] >= minVersion;
    browserName = 'Safari ' + safariVersion[2];
}

function supportsGrid() {
    try {
        var test = document.createElement('div');
        document.body.appendChild(test);
        test.style.display = 'grid';
        var supportsGrid = getComputedStyle(test).display === 'grid';
        document.body.removeChild(test);
        return supportsGrid;
    } catch (err) {
        return false;
    }
}

// minor feature detection so we can show something more than “unknown browser” if that happens
if (
    !window.fetch // we don’t use a fetch polyfill
    || !window.Worker || !window.Worker.prototype.postMessage // web workers
    || !window.WeakSet // we compile to ES6
    || !supportsGrid() // we use CSS grid
) {
    isSupported = false;
    extraMessage = 'Via retumilo ne subtenas ĉiujn la funkciojn, kiujn AKSO bezonas.';
}

if (!isSupported) {
    var c = document.createElement('div');
    c.id = 'unsupported';
    c.style.zIndex = 100;
    c.style.background = '#fff';
    c.style.color = '#000';
    c.style.overflow = 'auto';
    c.style.padding = '16px';
    c.style.margin = '0';
    c.style.boxSizing = 'border-box';
    c.innerHTML = '<img src="/assets/logo.svg" /><img src="/assets/logo-label.svg" />';
    c.innerHTML += '<h1>Via retumilo ne estas subtenata</h1>';
    c.innerHTML += '<p>Ŝajnas, ke vi uzas: ' + browserName + '</p>';
    if (extraMessage) c.innerHTML += '<p>' + extraMessage + '</p>';
    if (updateLink) {
        var versionSuggestion = '';
        if (minVersion) versionSuggestion = ' (&geq;' + minVersion + ')';
        c.innerHTML += '<p>Bonvolu ĝisdatigi vian retumilon al pli nova versio' + versionSuggestion + ' aŭ elŝuti de tie ĉi: ' + updateLink + '</p>';
    } else {
        c.innerHTML += '<p>Bonvolu ĝisdatigi al pli nova retumilo kiel ekz. ' + firefoxLink + ' aŭ ' + googleLink + '.</p>';
    }
    document.body.appendChild(c);
}
