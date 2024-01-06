import { h } from 'preact';
import { base } from 'akso:config';
import DownloadIcon from '@material-ui/icons/SaveAlt';
import Page from '../../../../components/page';
import DetailView from '../../../../components/detail/detail';
import { timestamp } from '../../../../components/data';
import { IdUEACode } from '../../../../components/data/uea-code';
import { FileThumbnail, Mime, FileSize } from '../../../../components/files';
import Meta from '../../../meta';
import { codeholders as locale } from '../../../../locale';
import { connectPerms } from '../../../../perms';
import { coreContext } from '../../../../core/connection';
import FileView from './file-view';
import './file-detail.less';

export default connectPerms(class FileDetailPage extends Page {
    static contextType = coreContext;

    state = {
        fileName: '?',
        fileUrl: '',
    };

    getCodeholderId = () => +this.props.matches.codeholder[1];
    getId = () => +this.props.match[1];

    render ({ perms }, { fileName }) {
        const id = this.getId();
        const codeholderId = this.getCodeholderId();
        const actions = [];

        actions.push({
            icon: <DownloadIcon style={{ verticalAlign: 'middle' }} />,
            label: locale.downloadFile,
            action: () => {
                const anchor = document.createElement('a');
                anchor.rel = 'noopener noreferrer';
                // open in a new tab because some browsers just insist on not downloading the file
                anchor.target = '_blank';
                anchor.download = this.state.fileName;
                anchor.href = this.state.fileUrl;
                anchor.click();
            },
        });

        if (perms.hasCodeholderField('files', 'w')) {
            actions.push({
                label: locale.delete,
                action: () => this.context.createTask('codeholders/deleteFile', {
                    id: this.getCodeholderId(),
                    file: this.getId(),
                }),
                overflow: true,
                danger: true,
            });
        }

        return (
            <div class="codeholders-file-detail-page">
                <Meta
                    title={locale.fileTitle}
                    actions={actions} />
                <DetailView
                    view="codeholders/codeholderFile"
                    id={id}
                    options={{ codeholderId }}
                    header={Header}
                    footer={({ item }) => {
                        // minor hack to get the file name to download with
                        if (item && item.name !== fileName) this.setState({ fileName: item.name });
                        if (item) this.setState({ fileUrl: item.url });
                    }}
                    locale={locale.files}
                    onDelete={() => this.props.pop()}
                    userData={{ codeholderId }} />
            </div>
        );
    }
});

function Header ({ item, userData }) {
    return (
        <div class="file-header">
            <h1 class="file-title">
                <FileThumbnail mime={item.mime} />
                {item.name}
            </h1>
            <div class="file-details">
                <span class="file-type">
                    <Mime mime={item.mime} />
                </span>
                {' · '}
                <span class="file-size">
                    <FileSize bytes={item.size} />
                </span>
                {item.addedBy && ' · '}
                {item.addedBy && (
                    <span class="file-added-by">
                        {locale.fileAddedBy}
                        <IdUEACode id={item.addedBy} />
                    </span>
                )}
                {' · '}
                <span class="file-time">
                    <timestamp.inlineRenderer value={item.time} />
                </span>
            </div>
            <p class="file-description">
                {item.description}
            </p>
            <div class="file-view-container">
                <FileView url={item.url} name={item.name} mime={item.mime} />
            </div>
        </div>
    );
}
