import * as child_process from 'child_process';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { XmlCommentNode, XmlDocument } from 'xmldoc';
import { GetSettings, IISExpressSettings } from './settings';
import { VerificationResult } from './verification';


export class IISExpress
{
	private _iisProcess: child_process.ChildProcess;
	private _iisPath: string;
	private _configPath: string;
	private _iisArgs: IISExpressSettings;
	private _output: vscode.OutputChannel;
	private _statusbar: vscode.StatusBarItem;
	private _statusMessage: string;
	private _verification: VerificationResult;

	constructor(iisPath: string, verification: VerificationResult)
	{
		this._iisPath = iisPath;
		this._verification = verification;
	}

	public StartServer(): child_process.ChildProcess
	{
		if (this._iisProcess !== undefined) {
			vscode.window.showErrorMessage('IISExpress is already running');
			return;
		}

		this._iisArgs = GetSettings();

		// Spawn the IISExpress cmd
		var argv = this.GetCommandLineOptions();
		this._iisProcess = child_process.spawn(this._iisPath, argv);
		console.log(`stdout: Command with Params ${this._iisPath} ${argv.join(' ')}`);

		// Create output channel & show it
		this._output = this._output || vscode.window.createOutputChannel('IIS Express');
		this._output.show(vscode.ViewColumn.Three);

		// Create Statusbar item & show it
		this._statusbar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
		this._statusbar.text = `$(browser) http://localhost:${this._iisArgs.port}`;
		this._statusMessage =
			`Running folder '${this._iisArgs.path}' as a website ` +
			`on http://localhost:${this._iisArgs.port}/ ` +
			`on CLR: ${this._iisArgs.clr} ` +
			`using the ${this._iisArgs.pipeline} Pipeline`;
		this._statusbar.tooltip = this._statusMessage;
		this._statusbar.command = 'extension.iis-express-mod.open';
		this._statusbar.show();

		this.OpenBrowser();

		// Attach all the events & functions to iisProcess
		this._iisProcess.stdout.on('data', (data) => {
			var dataDecoded = this.decode2gbk(data);
			this._output.appendLine(dataDecoded);
			console.log(`stdout: ${dataDecoded}`);
		});
		this._iisProcess.stderr.on('data', (data) => {
			var dataDecoded = this.decode2gbk(data);
			this._output.appendLine(`stderr: ${dataDecoded}`);
			console.log(`stderr: ${dataDecoded}`);
		});
		this._iisProcess.on('error', (err: Error) => {
			var message = this.decode2gbk(err.message);
			this._output.appendLine(`ERROR: ${message}`);
			console.log(`ERROR: ${message}`);
		});

		vscode.window.showInformationMessage(this._statusMessage);
	}

	public StopServer()
	{
		if (!this._iisProcess) {
			vscode.window.showErrorMessage('No website currently running');
			return;
		}

		// Kill the process
		this._iisProcess.kill('SIGINT');
		this._iisProcess = undefined;
		if (this._configPath) {
			fs.unlinkSync(this._configPath);
			this._configPath = null;
		}

		// Clear the output log
		this._output.clear();
		this._output.hide();
		this._output.dispose();

		// Remove the statusbar item
		this._statusbar.hide();
		this._statusbar.dispose();
	}

	public OpenBrowser()
	{
		if (!this._iisProcess) {
			vscode.window.showErrorMessage('No website currently running');
			return;
		}

		child_process.exec(`start http://localhost:${this._iisArgs.port}`);
	}

	public RestartServer()
	{
		if (!this._iisProcess) {
			this.StartServer();
		} else {
			this.StopServer();
			this.StartServer();
		}
	}

	private decode2gbk(data)
	{
		return iconv.decode(new Buffer(data), 'gbk');
	}

	private GetCommandLineOptions()
	{
		var args = this._iisArgs;
		if (this._verification.ConfigTemplatePath !== null) {
			try {
				var config = fs.readFileSync(this._verification.ConfigTemplatePath, 'utf8');
				var doc = new XmlDocument(config);

				var appPool = doc.childNamed('system.applicationHost')
					.childNamed('applicationPools')
					.childWithAttribute('name', 'IISExpressAppPool');
				appPool.attr['managedRuntimeVersion'] = args.clr;
				appPool.attr['managedPipelineMode'] = args.pipeline;

				var site = doc.childNamed('system.applicationHost')
					.childNamed('sites')
					.childNamed('site');

				var application = site.childNamed('application');
				application.attr['applicationPool'] = 'IISExpressAppPool';

				var virtualDirectory = application.childNamed('virtualDirectory');
				virtualDirectory.attr['physicalPath'] = args.path;

				var binding = site.childNamed('bindings')
					.childWithAttribute('protocol', 'http');
				binding.attr['bindingInformation'] = `:${args.port}:localhost`;

				var asp = doc.childNamed('system.webServer')
					.childNamed('asp');
				Object.keys(args.asp).forEach(function (k) {
					asp.attr[k] = '' + args.asp[k];
				});

				this._configPath = path.join(os.tmpdir(), 'applicationhost' + datestamp() + '.config');
				fs.writeFileSync(
					this._configPath,
					'<?xml version="1.0" encoding="UTF-8"?>\n' + doc.toString({compressed:true}),
					{encoding: 'utf8'}
				);

				return [`/config:${this._configPath}`];
			} catch (e) {
				console.log(e);
			}
		}

		return [
			`/path:${this._iisArgs.path}`,
			`/port:${this._iisArgs.port}`,
			`/clr:${this._iisArgs.clr}`,
		];
	}
}

function datestamp()
{
	var now = new Date();

	return '' + now.getFullYear() +
		('0' + (now.getMonth() + 1)).slice(-2) +
		('0' + now.getDate()).slice(-2) +
		('0' + now.getHours()).slice(-2) +
		('0' + now.getMinutes()).slice(-2) +
		('0' + now.getSeconds()).slice(-2) +
		('00' + now.getMilliseconds()).slice(-3);
}
