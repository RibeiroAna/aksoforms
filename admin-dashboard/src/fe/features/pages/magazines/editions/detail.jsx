import { h } from 'preact';
import { Fragment } from 'preact/compat';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../../components/detail/detail-page';
import UrlViewImage from '../../../../components/controls/url-view-image';
import DetailShell from '../../../../components/detail/detail-shell';
import DetailFields from '../../../../components/detail/detail-fields';
import { DocumentIcon } from '../../../../components/icons';
import { connect } from '../../../../core/connection';
import { connectPerms } from '../../../../perms';
import { magazineEditions as locale, magazineToc as tocLocale, magazineSnaps as snapLocale } from '../../../../locale';
import { Files } from './files';
import { FIELDS } from './fields';
import TocView from './toc';
import { GetMagazineData } from '../utils';
import './detail.less';

export default connectPerms(class MagazineEdition extends DetailPage {
    state = {
        org: null,
        magazineSubscribers: null,
    };

    className = 'magazine-edition-page';
    locale = locale;

    createCommitTask (changedFields, edit) {
        return this.context.createTask('magazines/updateEdition', {
            magazine: this.magazine,
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    get magazine () {
        return +this.props.matches.magazine[1];
    }

    get id () {
        return +this.props.match[1];
    }

    renderActions ({ perms }, { org }) {
        const { magazine, id } = this;
        const actions = [];

        actions.push({
            label: snapLocale.title,
            action: () => this.props.push('momentaj-abonantoj'),
            overflow: true,
        });

        if (perms.hasPerm(`magazines.update.${org}`)) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: tocLocale.create.menuItem,
                action: () => this.context.createTask('magazines/createTocEntry', {
                    magazine,
                    edition: id,
                }),
            });
        }

        if (perms.hasPerm(`magazines.update.${org}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: this.onBeginEdit,
            });
        }

        if (perms.hasPerm(`magazines.update.${org}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('magazines/deleteEdition', { magazine, id }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ perms, editing }, { org, edit }) {
        const { magazine, id } = this;

        const canUpload = perms.hasPerm(`magazines.files.update.${org}`);
        const canDelete = perms.hasPerm(`magazines.files.delete.${org}`);

        return (
            <Fragment>
                <DetailShell
                    view="magazines/edition"
                    options={{ magazine }}
                    id={id}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()}>
                    {data => (
                        <DetailContents
                            magazine={magazine}
                            id={id}
                            data={data}
                            item={this.state.edit || data}
                            editing={editing}
                            onItemChange={edit => this.setState({ edit })}
                            magazineSubscribers={this.state.magazineSubscribers} />
                    )}
                </DetailShell>

                {!editing && (
                    <Files
                        formats={{
                            pdf: 'application/pdf',
                            epub: 'application/epub+zip',
                        }}
                        icon={<DocumentIcon />}
                        view="magazines/editionFiles"
                        options={{ magazine, id }}
                        onUpload={(core, format, file) => {
                            core.createTask('magazines/updateEditionFile', { magazine, id }, { format, file });
                        }}
                        onDelete={(core, format) => {
                            core.createTask('magazines/deleteEditionFile', { magazine, id }, { format });
                        }}
                        canUpload={canUpload}
                        canDelete={canDelete} />
                )}

                {!editing && (
                    <div class="edition-toc-title">
                        {tocLocale.title}
                    </div>
                )}
                {!editing && (
                    <TocView
                        magazine={magazine}
                        edition={id}
                        query={this.props.query}
                        onQueryChange={this.props.onQueryChange} />
                )}

                <GetMagazineData
                    id={this.magazine}
                    onData={data => data && this.setState({ org: data.org, magazineSubscribers: data.subscribers })} />
            </Fragment>
        );
    }
});

function DetailContents ({ magazine, id, data, item, editing, onItemChange, magazineSubscribers }) {
    return (
        <div class="edition-detail-contents">
            <div class="edition-header">
                <UrlViewImage
                    editing={editing}
                    class="edition-thumbnail"
                    contain lightbox
                    sizes={[32, 64, 128, 256, 512, 1024]}
                    urlView="magazines/edition"
                    urlViewField="thumbnail"
                    options={{ magazine, id }}
                    placeholder={<EditionPlaceholderThumbnail magazine={magazine} edition={item} />}
                    onUpdate={(thumbnail, core) => {
                        const task = core.createTask('magazines/updateEditionThumbnail', {
                            magazine,
                            id,
                        }, {
                            thumbnail,
                        });
                        return task.runOnceAndDrop();
                    }}
                    onDelete={core => {
                        core.createTask('magazines/deleteEditionThumbnail', {
                            magazine,
                            id,
                        });
                    }} />
                <div class="header-details">
                    <DetailFields
                        data={data}
                        edit={item}
                        editing={editing}
                        onEditChange={onItemChange}
                        fields={FIELDS}
                        locale={locale}
                        userData={{ magazineSubscribers }}
                        compact />
                </div>
            </div>
        </div>
    );
}

const EditionPlaceholderThumbnail = connect(({ magazine }) => ['magazines/magazine', { id: magazine }])(data => ({
    magazine: data,
}))(function EditionPlaceholderThumbnail ({ magazine, edition }) {
    return (
        <div class="edition-placeholder-thumbnail">
            <div class="th-title">{magazine?.name}</div>
            <div class="th-subtitle">{edition.idHuman}</div>
        </div>
    );
});
