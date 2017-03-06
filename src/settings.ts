import * as jsonfile from 'jsonfile';
import { validate } from 'jsonschema';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';


type CLRVersion = 'v2.0' | 'v4.0';
type PipelineMode = 'Classic' | 'Integrated';
type ScriptLanguage = 'JScript' | 'VBScript';


export interface IISExpressSettings
{
	clr?: CLRVersion;
	path?: string;
	port: number;
	pipeline?: PipelineMode;
	asp?: IISExpressASPSettings;
}


export interface IISExpressASPSettings
{
	appAllowClientDebug?: boolean;
	appAllowDebugging?: boolean;
	bufferingOn?: boolean;
	calcLineNumber?: boolean;
	codePage?: number;
	enableApplicationRestart?: boolean;
	enableAspHtmlFallback?: boolean;
	enableChunkedEncoding?: boolean;
	enableParentPaths?: boolean;
	errorsToNTLog?: boolean;
	exceptionCatchEnable?: boolean;
	lcid?: number;
	logErrorRequests?: boolean;
	runOnEndAnonymously?: boolean;
	scriptErrorMessage?: string;
	scriptErrorSentToBrowser?: boolean;
	scriptLanguage?: ScriptLanguage;
}


export function GetSettings(): IISExpressSettings
{
	var readSettings: any = null;
	var readSchema: any = null;
	let settings: IISExpressSettings = {
		clr: 'v4.0',
		path: vscode.workspace.rootPath,
		port: Math.floor(Math.random() * (44399 - 1024 + 1)) + 1024,
		pipeline: 'Integrated',
		asp: {
			appAllowClientDebug: false,
			appAllowDebugging: false,
			bufferingOn: true,
			calcLineNumber: true,
			codePage: 0,
			enableApplicationRestart: true,
			enableAspHtmlFallback: true,
			enableChunkedEncoding: true,
			enableParentPaths: false,
			errorsToNTLog: false,
			exceptionCatchEnable: true,
			lcid: 0,
			logErrorRequests: true,
			runOnEndAnonymously: true,
			scriptErrorMessage: 'An error occurred on the server when processing the URL. Please contact the system administrator',
			scriptErrorSentToBrowser: false,
			scriptLanguage: 'VBScript',
		},
	};

	// Checks that iisexpress.json exist
	let vscodePath = vscode.workspace.rootPath + '\\.vscode';
	let settingsPath = vscodePath + '\\iisexpress.json';

	try {
		fs.statSync(settingsPath);
		readSettings = jsonfile.readFileSync(settingsPath);
		readSchema = jsonfile.readFileSync(settingsPath);
	} catch (err) {
		// If there's an error opening the file attempt to create the file with default settings.
		fs.mkdirSync(vscodePath);
		jsonfile.writeFile(settingsPath, settings, {spaces: 2}, function (jsonErr) {
			if (jsonErr) {
				console.error(jsonErr);
				vscode.window.showErrorMessage('Error creating iisexpress.json file: ' + jsonErr);
			}
		});
	}

	// Perform validation on the settings
	if (readSettings !== null) {
		var v = validate(readSettings, require(path.join(__dirname, '..', '..', 'iisexpress-schema.json')));
		if (v.valid) {
			extend(settings, readSettings);
		} else {
			vscode.window.showWarningMessage(
				'Your iis-express.json file in configured incorrectly. ' +
				'IIS will be started in the default configuration'
			);
		}
	}

	return settings;
}


function extend(o1, o2)
{
	Object.keys(o2).forEach(function (k) {
		if (typeof o2[k] === 'object') {
			extend(o1[k], o2[k]);
		} else {
			o1[k] = o2[k];
		}
	});
}
