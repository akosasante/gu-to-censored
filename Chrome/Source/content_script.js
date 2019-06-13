const sourceReplacementPairs = [
	[/\bgu\b/gi,"CENSORED BY FLEX FOX"]
];

function debounce(func, wait, immediate) {
	let timeout;
	return function() {
		const context = this, args = arguments;
		const later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		const callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}

function throttle(func, wait, immediate) {
	let timeout;
	return function() {
		const context = this, args = arguments;
		const later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		const callNow = immediate && !timeout;
		if ( !timeout ) timeout = setTimeout( later, wait );
		if (callNow) func.apply(context, args);
	};
}

function skipDueToNodeType(node) {
	if (node) {
		const nodeName = (node && node.tagName) ? node.tagName.toLowerCase() : "";
		return nodeName === 'input' || nodeName === 'textarea' || nodeName === "script" || nodeName === "style";
	} else {
		return true;
	}
}

function skipDueToClass(node) {
	if (node) {
		const classListContainsAceEditor = node.classList && node.classList.length ? node.classList.contains('ace_editor') : false;
		const classListContainsQLEditor = (node.classList && node.classList.length) ? node.classList.contains('ql-editor') : false;
		const parentQlEditor = (node.parentElement && node.parentElement.classList && node.parentElement.classList.length)
			? node.parentElement.classList.contains('ql-editor') : false;
		const grannyQlEditor = (node.parentElement.parentElement && node.parentElement.parentElement.classList && node.parentElement.parentElement.classList.length)
			? node.parentElement.parentElement.classList.contains('ql-editor') : false;
		return classListContainsAceEditor || classListContainsQLEditor || parentQlEditor || grannyQlEditor;
	} else {
		return true;
	}
}

function walk(node, regexMatches) {
	// I stole this function from here:
	// http://is.gd/mwZp7E

	try {
		// console.log("checking node", node);
		// console.log(node.nodeType);ql-editor
		let child, next;

		if (skipDueToNodeType(node)) {
			console.log("%c skipping due to node type", 'background: #ffa500; color: #0a0');
			return;
		}

		if (skipDueToClass(node)) {
			console.log("%c skipping due to class type", 'background: #ffa500; color: #0a0');
			console.log(node.classList);
			return;
		}

		switch (node.nodeType) {
			case 1:  // Element
			case 9:  // Document
			case 11: {// Document fragment
				console.log("%c walking some more", 'background: #222; color: #bada55');
				console.log(node);
				child = node.firstChild;
				while (child) {
					next = child.nextSibling;
					walk(child, regexMatches);
					child = next;
				}
				break;
			}

			case 3: {// Text node
				console.log("%c text node", 'background: #4444; color: #daba22');
				const nodeValue = node.nodeValue.toLowerCase();
				// if (node.nodeValue === "this is my butt" || node.nodeValue === "this is the cloud") {
				// 	used for testing
				// 	console.log("AKTEST");
				// 	console.log(node);
				// 	break;
				// }
				if (nodeValue.includes("<script>") || nodeValue.includes("<style>")) {
					break;
				}
				handleText(node, regexMatches);
				break;
			}
		}
	} catch(e) {
		console.error(e);
		console.error(node);
	}
}

function handleText(textNode, regexPairs) {
	// console.log("called with", regexPairs);
	let originalVal = textNode.nodeValue;
	let v = textNode.nodeValue;
	regexPairs.forEach(regexPair => {
		v = v.replace(regexPair[0], regexPair[1]);
	});
	if (originalVal !== v) {
		textNode.nodeValue = v;
	}
}

function simpleReplace(node, sourceReplacementPair) {
	sourceReplacementPair.forEach(regexPair => {
		node.innerHTML = node.innerHTML.replace(regexPair[0], regexPair[1]);
	});
}

// document.addEventListener("DOMNodeInserted", function(e) {
// 	simpleReplace(document.body, sourceReplacementPairs);
// 	// walk(document.body, sourceReplacementPairs);
// }, false);

// if(document.readyState === 'loading') {
// 	console.log("listening to walk");
// 	document.addEventListener('DOMContentLoaded', walk(document.body, sourceReplacementPairs), false);
// } else {
// 	console.log("starting walk");
// 	walk(document.body, sourceReplacementPairs);
// }
const efficientWalk = throttle(function() {
	const elem = document.body;
	walk(elem, sourceReplacementPairs);
}, 100);

if (window.MutationObserver) {
	const observer = new MutationObserver(mutations => {
		Array.prototype.forEach.call(mutations, function (m) {
			if (m.type === 'childList') {
				console.log("================== \n Child list");
				console.log(m.target);
				efficientWalk(m.target, sourceReplacementPairs);
			} else if (m.target.nodeType === 3) {
				console.log("%c text node from mutation", 'background: #4444; color: #daba22');
				const nodeValue = m.target.nodeValue.toLowerCase();

				if (nodeValue.includes("<script>") || nodeValue.includes("<style>")) {
					return;
				}
				if (skipDueToNodeType(m.target)) {
					console.log("%c skipping due to node type from mutation", 'background: #ffa500; color: #0a0');
					return;
				}

				if (skipDueToClass(m.target)) {
					console.log("%c skipping due to class type from mutation", 'background: #ffa500; color: #0a0');
					console.log(m.target.classList);
					return;
				}

				handleText(m.target, sourceReplacementPairs);
			}
		});
	});

	let elem = document.body;
	if (window.location.hostname.includes("flexfoxfantasy.slack")) {
		console.log("WE'RE ON SLACK BABY (mutation)");
		elem = document.getElementsByClassName('c-message_list')[0] || elem;
	}
	observer.observe(elem, {
		childList: true,
		attributes: false,
		characterData: true,
		subtree: true
	});
}

if (window.location.hostname.includes("flexfoxfantasy.slack")) {
	// console.log("WE'RE ON SLACK BABY");
	const elems = document.getElementsByClassName('c-message__body');
	if (elems && elems.length) {
		Array.from(elems).forEach(elem => {
			simpleReplace(elem, sourceReplacementPairs);
		})
	}
}

efficientWalk();
