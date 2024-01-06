import { h } from 'preact';
import { Fragment } from 'preact/compat';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../../../components/detail/detail-page';
import DetailView from '../../../../../components/detail/detail';
import { AudioIcon } from '../../../../../components/icons';
import { magazineToc as locale } from '../../../../../locale';
import { connectPerms } from '../../../../../perms';
import { Files } from '../files';
import { FIELDS } from './fields';
import { GetMagazineData } from '../../utils';
import './detail.less';

export default connectPerms(class MagazineTocEntry extends DetailPage {
    locale = locale;
    className = 'magazine-toc-entry-page';

    createCommitTask (changedFields, edit) {
        return this.context.createTask('magazines/updateTocEntry', {
            magazine: this.magazine,
            edition: this.edition,
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    get magazine () {
        return +this.props.matches.magazine[1];
    }

    get edition () {
        return +this.props.matches.edition[1];
    }

    get id () {
        return +this.props.match[1];
    }

    renderActions ({ perms }) {
        const { magazine, edition, id } = this;

        const actions = [];

        if (perms.hasPerm('')) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: this.onBeginEdit,
            });
        }

        if (perms.hasPerm('')) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('magazines/deleteTocEntry', {
                    magazine,
                    edition,
                    id,
                }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ perms, editing }, { org, edit }) {
        const { magazine, edition, id } = this;

        const canUpload = perms.hasPerm(`magazines.recitations.update.${org}`);
        const canDelete = perms.hasPerm(`magazines.recitations.delete.${org}`);

        return (
            <Fragment>
                <DetailView
                    view="magazines/tocEntry"
                    options={{ magazine, edition }}
                    id={id}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()} />

                {!editing && (
                    <div class="recitation-title">
                        {locale.recitations.title}
                    </div>
                )}

                {!editing && (
                    <Files
                        formats={{
                            mp3: 'audio/mpeg',
                            wav: 'audio/wave',
                            flac: 'audio/flac',
                        }}
                        icon={<AudioIcon />}
                        view="magazines/tocRecitations"
                        options={{ magazine, edition, id }}
                        onUpload={(core, format, file) => {
                            core.createTask('magazines/updateTocRecitation', { magazine, edition, id }, { format, file });
                        }}
                        onDelete={(core, format) => {
                            core.createTask('magazines/deleteTocRecitation', { magazine, edition, id }, { format });
                        }}
                        canUpload={canUpload}
                        canDelete={canDelete} />
                )}

                <GetMagazineData
                    id={this.magazine}
                    onData={data => data && this.setState({ org: data.org })} />
            </Fragment>
        );
    }
});

