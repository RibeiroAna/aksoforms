import { h } from 'preact';
import JSON5 from 'json5';
import { useContext, useState, Fragment } from 'preact/compat';
import { Dialog } from 'yamdl';
import Page from '../../../components/page';
import ObjectViewer from '../../../components/object-viewer';
import { app as locale } from '../../../locale';
import permsContext from '../../../perms';
import { connect, coreContext } from '../../../core/connection';
import { Link } from '../../../router';
import Meta from '../../meta';

export default class DebugPage extends Page {
    render () {
        return (
            <div class="debug-page">
                <Meta title="AKSO Debug Page" />
                <p>{locale.debugPageInfo}</p>
                <LoginStateViewer />
                <PermsViewer />
                <CodeholderFieldsViewer />
                <CodeholderFiltersViewer />
                <RequestRunner />
                <TaskRunner />
                <SimulateError />
                <br />
                <Link target="/debug/launchpad_mcquack.jpg">open launchpad_mcquack.jpg</Link>
                <br />
                <Link target="/debug/components">open components</Link>
            </div>
        );
    }
}

function makeDialog (title, Inner) {
    return function ThingViewer () {
        const [open, setOpen] = useState(false);
        return (
            <Fragment>
                <button onClick={() => setOpen(true)}>{title}</button>
                <Dialog
                    open={open}
                    onClose={() => setOpen(false)}
                    title={title}
                    style={{ width: '80%', height: '80%' }}>
                    <Inner />
                </Dialog>
            </Fragment>
        );
    };
}

function makeDataViewer (title, view) {
    return makeDialog(title, connect(view)(data => ({ data }))(({ data }) => (
        <ObjectViewer value={data} />
    )));
}

const PermsViewer = makeDialog('perms', () => (
    <permsContext.Consumer>
        {perms => <ObjectViewer value={perms.perms} />}
    </permsContext.Consumer>
));

const CodeholderFieldsViewer = makeDataViewer('codeholder fields', 'codeholders/fields');
const CodeholderFiltersViewer = makeDataViewer('codeholder filters', 'codeholders/filters');
const LoginStateViewer = makeDataViewer('login state', 'login');

function ReqRunnerInner ({ core }) {
    const [method, setMethod] = useState('get');
    const [endpoint, setEndpoint] = useState('');
    const [options, setOptions] = useState('');
    const [body, setBody] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const run = () => {
        core.createTask('debug/request', {
            method,
            endpoint,
            options: options.trim() ? JSON5.parse(options) : undefined,
            body: body.trim() ? JSON5.parse(body) : undefined,
        }).runOnceAndDrop().then(res => {
            setResult(res);
            setError(null);
        }).catch(err => {
            setResult(null);
            setError(err);
        });
    };

    return (
        <div>
            <select value={method} onChange={e => setMethod(e.target.value)}>
                <option value="get">GET</option>
                <option value="post">POST</option>
                <option value="put">PUT</option>
                <option value="patch">PATCH</option>
                <option value="delete">DELETE</option>
            </select>
            <input value={endpoint} onChange={e => setEndpoint(e.target.value)} />
            <br />
            options: <textarea value={options} onChange={e => setOptions(e.target.value)} />
            <br />
            body: <textarea value={body} onChange={e => setBody(e.target.value)} />
            <br />
            <button onClick={run}>run</button>
            <br />
            {result ? 'result' : error ? 'error' : ''}
            {result ? <ObjectViewer value={result} /> : null}
            {error ? <ObjectViewer value={error} /> : null}
        </div>
    );
}

const RequestRunner = makeDialog('run request', () => (
    <coreContext.Consumer>{core => <ReqRunnerInner core={core} />}</coreContext.Consumer>
));

function TaskRunnerInner ({ core }) {
    const [task, setTask] = useState('');
    const [options, setOptions] = useState('{}');
    const [parameters, setParameters] = useState('{}');
    const [instance, setInstance] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const create = () => {
        setError(null);
        let ti;
        try {
            ti = core.createTask(task, JSON5.parse(options), JSON5.parse(parameters));
        } catch (err) {
            setError(err);
            return;
        }
        setInstance(ti);
        ti.on('drop', () => setInstance(null));
    };
    const iRun = () => {
        instance.runOnce().then(res => {
            setInstance(null);
            setError(null);
            setResult(res);
        }).catch(err => {
            setError(err);
        });
    };
    const iDrop = () => instance.drop();

    return (
        <div>
            task: <input value={task} onChange={e => setTask(e.target.value)} />
            <br />
            options: <textarea value={options} onChange={e => setOptions(e.target.value)} />
            <br />
            parameters: <textarea value={parameters} onChange={e => setParameters(e.target.value)} />
            <br />
            <button onClick={create}>create</button>
            <br />
            {instance ? (
                <div>
                    task instance
                    <br />
                    options: <ObjectViewer value={instance.options} />
                    <br />
                    parameters: <ObjectViewer value={instance.parameters} />
                    <br />
                    <button onClick={iRun}>run once</button>
                    <button onClick={iDrop}>drop</button>
                </div>
            ) : null}
            {result ? 'result' : ''}
            {result ? <ObjectViewer value={result} /> : null}
            {error ? 'error' : ''}
            {error ? <ObjectViewer value={error} /> : null}
        </div>
    );
}

const TaskRunner = makeDialog('create task', () => (
    <coreContext.Consumer>{core => <TaskRunnerInner core={core} />}</coreContext.Consumer>
));

function SimulateError () {
    const [code, setCode] = useState('service-unavailable');
    const [message, setMessage] = useState('error');
    const core = useContext(coreContext);

    return (
        <details>
            <summary>simulate error</summary>
            <div>
                <label>code</label>
                <input value={code} onChange={e => setCode(e.target.value)} />
            </div>
            <div>
                <label>message</label>
                <input value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            <button onClick={() => {
                core.createTask('debug/error', { code, message }).runOnceAndDrop();
            }}>boop</button>
        </details>
    );
}
