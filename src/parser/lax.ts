/// <reference path="./../../typings/tsd.d.ts" />

'use strict';

import P = require('parsimmon');

import model = require('../model');
import regex = require('../regex');
import utils = require('../utils');


var id = P.regex(regex.label).desc('project name');
var semver = P.regex(regex.semverV).desc('semver');
var space = P.string(' ');
var colon = P.string(':');
var optColon = P.regex(/:?/);
var linebreak = P.regex(/\r?\n/).desc('linebreak');
var lineTrail = P.regex(/[ \t]*\r?\n/).desc('linebreak');
var tabSpace = P.regex(/[ \t]/).desc('tab or space');
var optTabSpace = P.regex(/[ \t]*/).desc('tab or space');
var optComma = P.regex(/,?/);

var url = P.regex(regex.uri).desc('url');
var urlBracket = P.string('<').then(url).skip(P.string('>'));

var bomOpt = P.regex(regex.bomOpt);

var comment = P.string('//');
var commentSpace = comment.skip(space);
var commentTab = comment.skip(tabSpace);
var comment3 = P.string('///').skip(space);

var nameUTF = P.regex(regex.nameUTF).desc('name');

var separatorComma = P.string(',')
	.then(space.or(optTabSpace
		.then(linebreak)
		.then(comment)
		.then(tabSpace)
		.then(optTabSpace)
	)
);

var separatorOptComma = P.seq(P.string(','), space)
	.or(optTabSpace
		.then(optComma)
		.then(linebreak)
		.then(comment)
		.then(tabSpace)
		.then(optTabSpace)
);

var separatorProject = P.seq(P.string(','), space)
	.or(optTabSpace
		.then(optComma)
		.then(linebreak)
		.then(comment)
		.then(tabSpace)
		.then(P.seq(
			P.string('Project:'),
			tabSpace
		).or(optTabSpace))
);

export var person: P.Parser<model.Person> = P.seq(
		nameUTF,
		space.then(urlBracket)
	)
	.map((arr) => {
		return {
			name: arr[0],
			url: arr[1] ? utils.untrail(arr[1]) : null
		};
	})
	.skip(optTabSpace);

export var label: P.Parser<model.Label> = P.string('// Type definitions for ')
	.then(P.seq(
		id,
		space.then(
			P.string('(')
				.then(P.seq(
					id,
					P.string(', ').then(id).many()
				).map((arr: any[]) => {
					return [arr[0]].concat(arr[1]);
				}))
				.skip(P.string(')'))
		)
		.or(P.succeed(null))
	))
	.map((arr: any[]) => {
		regex.semverExtract.lastIndex = 0;
		var match = regex.semverExtract.exec(arr[0]);
		var semver: string = null;
		var label: string = arr[0];
		if (match) {
			label = match[1];
			semver = match[2];
		}
		return {
			name: label + (arr[1] ? ' (' + arr[1].join(', ') + ')' : ''),
			version: semver
		};
	})
	.skip(optTabSpace);

export var project: P.Parser<model.Project[]> = P.string('// Project: ')
	.then(P.seq(
		url,
		separatorProject.then(url).many()
	))
	.map((arr: any) => {
		var ret = [];
		ret.push({
			url: utils.untrail(arr[0])
		});
		arr[1].forEach((url: string) => {
			ret.push({
				url: utils.untrail(url)
			});
		});
		return ret;
	})
	.skip(optTabSpace);

export var authors: P.Parser<model.Author[]> = P.string('// Definitions by: ')
	.then(P.seq(
		person,
		separatorComma.then(person).many()
	))
	.map((arr) => {
		var ret = <model.Author[]> arr[1];
		ret.unshift(<model.Author> arr[0]);
		return ret;
	})
	.skip(optTabSpace);

export var repo: P.Parser<model.Repository> = P.string('// Definitions: ')
	.then(url)
	.map((url) => {
		return {
			url: utils.untrail(url)
		};
	})
	.skip(optTabSpace);

export var header: P.Parser<model.Header> = bomOpt
	.then(P.seq(
		label.skip(linebreak),
		project.skip(linebreak),
		authors.skip(linebreak),
		repo.skip(linebreak)
	))
	.skip(P.all)
	.map((arr) => {
		return <model.Header> {
			label: <model.Label> arr[0],
			project: <model.Project[]> arr[1],
			authors: <model.Author[]> arr[2],
			repository: <model.Repository> arr[3]
		};
	});
