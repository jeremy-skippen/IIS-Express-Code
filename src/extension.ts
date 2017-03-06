import * as vscode from 'vscode';
import { IISExpress } from './IISExpress';
import { VerificationResult, VerifyIISExpressInstallation } from './verification';


export function activate(context: vscode.ExtensionContext)
{
	let verification: VerificationResult = VerifyIISExpressInstallation();
	let proc = new IISExpress(verification.ExecutablePath, verification);

	let startServer = vscode.commands.registerCommand('extension.iis-express-mod.start', () => {
		if (!verification.CanRun) {
			return;
		}

		proc.StartServer();
	});

	let stopServer = vscode.commands.registerCommand('extension.iis-express-mod.stop', () => {
		if (!verification.CanRun) {
			return;
		}

		proc.StopServer();
	});

	let openBrowser = vscode.commands.registerCommand('extension.iis-express-mod.open', () => {
		if (!verification.CanRun) {
			return;
		}

		proc.OpenBrowser();
	});

	let restartServer = vscode.commands.registerCommand('extension.iis-express-mod.restart', () => {
		if (!verification.CanRun) {
			return;
		}

		proc.RestartServer();
	});

	context.subscriptions.push(startServer, stopServer, openBrowser, restartServer);
}


export function deactivate()
{
}
