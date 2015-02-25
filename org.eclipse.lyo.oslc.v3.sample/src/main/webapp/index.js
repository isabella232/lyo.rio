/*******************************************************************************
 * Copyright (c) 2015 IBM Corporation.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * and Eclipse Distribution License v. 1.0 which accompanies this distribution.
 *
 * The Eclipse Public License is available at http://www.eclipse.org/legal/epl-v10.html
 * and the Eclipse Distribution License is available at
 * http://www.eclipse.org/org/documents/edl-v10.php.
 *
 * Contributors:
 *
 *     Samuel Padgett       - initial API and implementation
 *******************************************************************************/

// JSON-LD context for creating bugs
var context = {
	oslc_cm: "http://open-services.net/ns/cm#",
	dcterms: "http://purl.org/dc/terms/",
	Defect: "oslc_cm:Defect",
	description: "dcterms:description",
	severity: {
		"@id": "oslc_cm:severity",
		"@type": "@id"
	},
	title: "dcterms:title"
};

// Some sample defects to create.
var sampleBugs = [{
	title: "Product Z is too blue.",
	severity: "oslc_cm:Normal",
	description: "Let's use some other colors, OK?"
}, {
	title: "Product Z isn't blue enough.",
	severity: "oslc_cm:Normal",
	description: "I thought we wanted the UI to look really blue? What happened?"
}, {
	title: "Product Z crashes on startup",
	severity: "oslc_cm:Blocker",
	description: "I'm completed blocked! We need a fix ASAP."
}, {
	title: "Typo on login page",
	severity: "oslc_cm:Minor",
	description: "User is spelled 'luser'. I'm going to assume this is a mistake."
}];

function createBug(bug) {
	// Post the form as JSON-LD to the bug container.
	var content = $.extend({
		"@id": "",
		"@type": "Defect",
		"@context": context
	}, bug);

	return $.ajax({
		url: 'r/bugs',
		data: JSON.stringify(content),
		type: 'post',
		contentType: 'application/ld+json'
	});
}

function createNextSample(i) {
	var bug = sampleBugs[i];
	var request = createBug(bug);
	request.done(function() {
		i++;
		if (i < sampleBugs.length) {
			createNextSample(i);
		} else {
			$('#message').empty().text(sampleBugs.length + ' sample bugs created!');
			loadBugs();
		}
	});
	request.fail(function() {
		$('#message').empty().text('Error creating bug: ' + bug.title + '. Stopping.');
		loadBugs();
	});
}

function createSampleBugs() {
	createNextSample(0);
}

function showDialog() {
	$('<iframe/>', {
		src: 'newBug.html'
	}).css({
		border: 0,
		width: '450px',
		height: '395px'
	}).appendTo('#dialogContainer');
	$('.dialog').fadeIn('fast');
}

function getCompact(uri) {
	return $.ajax(uri, {
		headers: {
			Accept: 'application/json',
			Prefer: 'return=representation; include="http://open-services.net/ns/core#PreferCompact"'
		}
	});
}

function createPreview(link, compact) {
	var offset = link.offset();
	preview = $('<div class="preview"/>').css({
			top: offset.top + 30 + "px",
			left: offset.left + 10 + "px",
			display: 'none'
	});

	if (compact.title) {
		// FIXME: markup?
		link.text(compact.title);
		preview.append($('<div class="previewTitle"/>').text(compact.title));
	}

	var p = compact.smallPreview || compact.largePreview;
	if (p) {
		var document = p.document;
		var width = p.hintWidth || '400px';
		var height = p.hintHeight || '300px';
		preview.append($('<iframe/>', {
					src: document
		}).css({
				width: width,
				height: height,
				border: 0
		}));
		preview.appendTo('body').fadeIn('fast');
	}

	return preview;
}

function setupPreview(link, uri) {
	var preview;
	var mouseInsidePreview = false;

	// Show the preview on hover.
	link.hover(function() {
		var request = getCompact(uri);
		request.done(function(data) {
			if (preview) {
				preview.fadeIn('fast');
			} else if (data.compact) {
				preview = createPreview(link, data.compact);
				preview.hover(function() {
					mouseInsidePreview = true;
				}, function() {
					mouseInsidePreview = false;
					preview.fadeOut('fast');
				});
			}
		});
	}, function() {
		if (preview) {
			// Allow the user to move the mouse into the preview without it
			// disappearing.
			setTimeout(function() {
				if (!mouseInsidePreview) {
					preview.fadeOut('fast');
				}
			}, 500);
		}
	});
}

window.addEventListener("message", function(event) {
	var sameOrigin =
		location.protocol + '//' + location.hostname +
		(location.port ? ':' + location.port : '');
	if (event.origin !== sameOrigin) {
		return;
	}

	// Make sure the message starts with oslc-response:
	var message = event.data;
	if (message.indexOf("oslc-response:") !== 0) {
		return;
	}

	// Handle each result.
	var response = JSON.parse(message.substr("oslc-response:".length));
	var results = response["oslc:results"];
	for (var i = 0; i < results.length; i++) {
		var label = results[i]["oslc:label"];
		var uri = results[i]["rdf:resource"];
		var link = $('<a/>', {
			href: uri
		}).text(label || uri);
		$('#message').empty().text('New bug: ').append(link);
		setupPreview(link, uri);
	}

	loadBugs();

	// Remove the dialog from the page.
	$('.dialog').fadeOut('fast', function() {
		$('#dialogContainer').empty();
	});
}, false);

function loadBugs() {
	var request = $.ajax('r/bugs', {
		headers: {
			Accept: 'text/turtle',
			Prefer: 'return=representation; include="http://www.w3.org/ns/ldp#PreferContainment http://open-services.net/ns/core#PreferDialog"'
		}
	});

	request.done(function(data) {
		$('#bugs').text(data);
	});
}

$(document).ready(function() {
	$('#openBug').on('click', showDialog);
	$('#createSample').on('click', createSampleBugs);
	loadBugs();
});
