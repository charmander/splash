'use strict';

function render(template, variables) {
	return template.replace(/{{\s*(.+?)\s*}}/g, function (_, name) {
		return variables[name];
	});
}

var variables = {};

process.argv.slice(2).forEach(function (arg) {
	var i = arg.indexOf('=');
	var name = arg.substring(0, i);
	var value = arg.substring(i + 1);

	variables[name] = value;
});

var parts = [];

process.stdin.on('data', function (part) {
	parts.push(part);
});

process.stdin.on('end', function () {
	var template = Buffer.concat(parts).toString('utf8');

	process.stdout.write(render(template, variables));
});
