import * as jsonfile from 'jsonfile';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

export enum CLRVersion
{
	v20 = <any>'v2.0',
	v40 = <any>'v4.0'
}

export enum PipelineMode
{
	Classic = <any>'Classic',
	Integrated = <any>'Integrated'
}

interface IISSettings
{
	clr: CLRVersion;
	path: string;
	port: number;
	pipeline: PipelineMode;
}

export function GetSettings(): IISSettings
{
	let settings: IISSettings = {
		clr: CLRVersion.v40,
		path: vscode.workspace.rootPath,
		port: Math.floor(Math.random() * (44399 - 1024 + 1)) + 1024,
		pipeline: PipelineMode.Integrated,
	};

	// Checks that iisexpress.json exist
	let vscodePath = vscode.workspace.rootPath + '\\.vscode';
	let settingsPath = vscodePath + '\\iisexpress.json';

	try {
		fs.statSync(settingsPath);
		settings = jsonfile.readFileSync(settingsPath);
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

	return settings;
}
