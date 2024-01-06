import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import Page from '../../../../components/page';
import Meta from '../../../meta';
import DataList from '../../../../components/lists/data-list';
import pickFile from '../../../../components/pick-file';
import { FileThumbnail, Mime, FileSize } from '../../../../components/files';
import { IdUEACode } from '../../../../components/data/uea-code';
import { timestamp } from '../../../../components/data';
import { codeholders as locale } from '../../../../locale';
import { coreContext } from '../../../../core/connection';
import { connectPerms } from '../../../../perms';
import './files-page.less';

export default connectPerms(class FilesPage extends Page {
    static contextType = coreContext;

    getId = () => +this.props.matches.codeholder[1];

    uploadFile = () => pickFile('*/*', files => {
        const file = files[0];
        this.context.createTask('codeholders/uploadFile', { id: this.getId() }, {
            file,
            name: file.name,
            description: '',
        });
    });

    renderFile = file => {
        return (
            <div class="member-file">
                <FileThumbnail id={file.id} mime={file.mime} />
                <div class="file-details">
                    <div class="file-name">
                        <span class="file-id">#{file.id}</span>
                        {file.name}
                    </div>
                    <div class="file-description">{file.description}</div>
                    <div class="file-meta">
                        <span class="file-type">
                            <Mime mime={file.mime} />
                        </span>
                        {' · '}
                        <span class="file-size">
                            <FileSize bytes={file.size} />
                        </span>
                        {file.addedBy && ' · '}
                        {file.addedBy && (
                            <span class="file-added-by">
                                {locale.fileAddedBy}
                                <IdUEACode id={file.addedBy} />
                            </span>
                        )}
                        {' · '}
                        <span class="file-time">
                            <timestamp.inlineRenderer value={file.time} />
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    onItemClick = file => {
        this.props.push('' + file.id);
    };

    render ({ perms }) {
        const id = this.getId();
        const canWriteFiles = perms.hasCodeholderField('files', 'w');

        const actions = [];
        if (canWriteFiles) {
            actions.push({
                icon: <AddIcon />,
                label: locale.uploadFile,
                action: this.uploadFile,
            });
        }

        return (
            <div class="member-files-page">
                <Meta
                    title={locale.filesTitle}
                    actions={actions} />
                <DataList
                    class="files-list"
                    updateView={['codeholders/codeholderSigFiles', { id }]}
                    onLoad={(offset, limit) =>
                        this.context.createTask('codeholders/listFiles', { id }, {
                            offset,
                            limit,
                        }).runOnceAndDrop()}
                    emptyLabel={locale.noFiles}
                    renderItem={this.renderFile}
                    onItemClick={this.onItemClick}
                    onRemove={item => this.context
                        .createTask('codeholders/deleteFile', { id, file: item.id, _noGUI: true })
                        .runOnceAndDrop()} />
            </div>
        );
    }
});
