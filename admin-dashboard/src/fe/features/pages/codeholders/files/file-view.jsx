import { h, Component } from 'preact';
import { Button, LinearProgress } from 'yamdl';
import DisplayError from '../../../../components/utils/error';
import { data as dataLocale, codeholders as locale } from '../../../../locale';

/** Previews a file. */
export default class FileView extends Component {
    state = {
        invalid: false,
        progress: 0,
        data: null,
        error: null,
    };

    load () {
        const { mime } = this.props;
        const typeSpec = getTypespec(mime);
        if (typeSpec.shouldLoadDirectly) return;
        if (!typeSpec) this.setState({ invalid: true });
        const fileURL = this.props.url;

        this.setState({
            progress: NaN,
            data: null,
            error: null,
        });

        fetch(fileURL).then(async res => {
            const reader = res.body.getReader();
            const len = +res.headers.get('content-length');

            this.setState({ progress: 0 });

            const chunks = [];
            let chunksLen = 0;
            while (true) { // eslint-disable-line no-constant-condition
                const { value, done } = await reader.read();
                if (done) break;
                chunks.push(value);
                chunksLen += value.length;

                this.setState({ progress: chunksLen / len });
            }

            this.setState({ progress: 1 });

            const blob = new Blob(chunks, { type: mime });
            const data = await typeSpec.prep(blob);
            this.setState({ data });
        }).catch(error => {
            this.setState({ error });
        });
    }

    componentDidMount () {
        this.load();
    }

    componentWillUnmount () {
        const type = this.props.mime;
        const typeSpec = getTypespec(type);
        if (typeSpec && typeSpec.release && this.state.data) typeSpec.release(this.state.data);
    }

    render ({ name, url, mime }, { progress, data, error, invalid }) {
        if (invalid) {
            return (
                <div class="file-view is-invalid">
                    <Button href={url} target="_blank" download={name}>
                        {locale.files.downloadToView}
                    </Button>
                </div>
            );
        }

        let contents = null;
        const typeSpec = getTypespec(mime);

        if (error) {
            contents = (
                <div class="file-view-error">
                    <DisplayError error={error} />
                    <Button onClick={() => this.load()}>
                        {dataLocale.retry}
                    </Button>
                </div>
            );
        } else if (data || typeSpec?.shouldLoadDirectly) {
            const Renderer = getTypespec(mime).component;
            contents = <Renderer data={data} url={url} />;
        }

        return (
            <div class="file-view">
                <div class="file-view-loading">
                    <LinearProgress
                        indeterminate={!Number.isFinite(progress)}
                        progress={progress}
                        class={(typeSpec?.shouldLoadDirectly || data || error) ? 'hide-none' : ''} />
                </div>
                {contents ? (
                    <div class="file-contents" data-mime={mime}>
                        {contents}
                    </div>
                ) : null}
            </div>
        );
    }
}

const imageType = {
    shouldLoadDirectly: true,
    component ({ url }) {
        return <img src={url} />;
    },
};

const videoType = {
    shouldLoadDirectly: true,
    component ({ url }) {
        return <video src={url} controls />;
    },
};

const audioType = {
    shouldLoadDirectly: true,
    component ({ url }) {
        return <audio src={url} controls />;
    },
};

const MIME_TYPES = {
    'text/*': {
        prep: blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject();
            reader.readAsText(blob);
        }),
        component ({ data }) {
            return <pre>{data}</pre>;
        },
    },
    'image/png': imageType,
    'image/jpeg': imageType,
    'image/svg+xml': imageType,
    'audio/mp3': audioType,
    'audio/mpeg': audioType,
    'video/mp4': videoType,
};

const BROWSER_SUPPORTS_NATIVE_PDF =
    navigator.userAgent.includes('Mac OS X')
    || (navigator.userAgent.includes('Windows NT') && !navigator.userAgent.includes('EdgeHTML'))
    || navigator.userAgent.includes('CrOS')
    || (navigator.userAgent.includes('Linux') && !navigator.userAgent.includes('Android'));

if (BROWSER_SUPPORTS_NATIVE_PDF) {
    MIME_TYPES['application/pdf'] = {
        prep: blob => URL.createObjectURL(blob),
        release: url => URL.revokeObjectURL(url),
        component ({ data }) {
            return <iframe
                src={data}
                class="pdf-frame"
                referrerpolicy="no-referrer" />;
        },
    };
}

const MIME_WILDCARDS = Object.keys(MIME_TYPES).filter(x => x.includes('*'));

function getTypespec (mime) {
    if (MIME_TYPES[mime]) return MIME_TYPES[mime];
    for (const wildcard of MIME_WILDCARDS) {
        const re = new RegExp(`^${wildcard.replace(/[+-/]/, m => '\\' + m).replace(/\*/g, '.+')}$`);
        if (mime.match(re)) return MIME_TYPES[wildcard];
    }
    return null;
}
