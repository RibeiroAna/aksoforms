import { h } from 'preact';
import { Fragment } from 'preact/compat';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../components/detail/detail-page';
import DetailView from '../../../components/detail/detail';
import { magazines as locale, magazineEditions as editionsLocale } from '../../../locale';
import { Header, FIELDS } from './fields';
import EditionsView from './editions';

export default class Magazine extends DetailPage {
    state = {
        org: null,
    };

    locale = locale;

    get id () {
        return +this.props.match[1];
    }

    createCommitTask (changedFields, edit) {
        return this.context.createTask('magazines/updateMagazine', {
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    renderActions ({ perms }, { org }) {
        const actions = [];

        if (perms.hasPerm(`magazines.update.${org}`)) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: editionsLocale.create.menuItem,
                action: () => this.context.createTask('magazines/createEdition', {
                    magazine: this.id,
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

        if (perms.hasPerm(`magazines.delete.${org}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('magazines/deleteMagazine', { id: this.id }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <Fragment>
                <DetailView
                    view="magazines/magazine"
                    id={this.id}
                    header={Header}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onData={data => data && this.setState({ org: data.org })}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={this.onDelete} />

                <EditionsView
                    magazine={this.id}
                    query={this.props.query}
                    onQueryChange={this.props.onQueryChange} />
            </Fragment>
        );
    }
}
