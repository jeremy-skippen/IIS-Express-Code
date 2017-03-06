import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';


export interface VerificationResult
{
	CanRun: boolean;
	ConfigTemplatePath: string;
	ExecutablePath: string;
	HasWorkspace: boolean;
	IsValidOS: boolean;
}


export function VerifyIISExpressInstallation():VerificationResult
{
	let results: VerificationResult = {
		CanRun: false,
		ConfigTemplatePath: null,
		ExecutablePath: null,
		HasWorkspace: false,
		IsValidOS: false,
	};

	// Check if we are on Windows and not OSX or Linux.
	if (!os.type().toUpperCase().includes('WINDOWS_NT')) {
		vscode.window.showErrorMessage('You can only run this extension on Windows.');
		results.IsValidOS = false;
	} else {
		results.IsValidOS = true;
	}

	// Check if we are in a folder/workspace and not just have a single file open.
	if (!vscode.workspace.rootPath) {
		vscode.window.showErrorMessage('Please open a workspace directory first.');
		results.HasWorkspace = false;
	} else {
		results.HasWorkspace = true;
	}

	// Verify IIS Express excutable exists.
	results.ExecutablePath = path.join(process.env.ProgramFiles, 'IIS Express', 'iisexpress.exe')
	try {
		// Check if we can find the file path (get stat info on it).
		fs.statSync(results.ExecutablePath);
	} catch (err) {
		// ENOENT - File or folder not found
		if (err && err.code.toUpperCase() === 'ENOENT') {
			vscode.window.showErrorMessage(`We did not find a copy of IISExpress.exe at ${results.ExecutablePath}`);
		} else if (err) {
			vscode.window.showErrorMessage(
				`There was an error trying to find IISExpress.exe at ${results.ExecutablePath} due to ${err.message}`
			);
		}

		results.ExecutablePath = null;
	}

	// Find the configuration template.
	results.ConfigTemplatePath = path.join(process.env.ProgramFiles, 'IIS Express', 'AppServer', 'applicationhost.config')
	try {
		fs.statSync(results.ConfigTemplatePath);
	} catch (err) {
		results.ConfigTemplatePath = null;
	}

	results.CanRun = results.IsValidOS && results.HasWorkspace && results.ExecutablePath !== null;
	return results;
}
