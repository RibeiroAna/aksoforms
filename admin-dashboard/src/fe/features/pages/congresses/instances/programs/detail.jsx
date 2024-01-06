import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import Meta from '../../../../meta';
import Page from '../../../../../components/page';
import DetailShell from '../../../../../components/detail/detail-shell';
import DetailFields from '../../../../../components/detail/detail-fields';
import MdField from '../../../../../components/controls/md-field';
import { coreContext } from '../../../../../core/connection';
import { connectPerms } from '../../../../../perms';
import { congressPrograms as locale } from '../../../../../locale';
import { FIELDS } from './fields';
import TagManager from '../tag-manager';
import './detail.less';
import { CopyIcon } from '../../../../../components/icons';

export default connectPerms(class ProgramPage extends Page {
    state = {
        edit: null,
        org: 'meow', // nonsense default value
        tz: null,
    };

    static contextType = coreContext;

    #commitTask = null;
    onCommit = changedFields => {
        if (!this.props.editing || this.#commitTask) return Promise.resolve();
        if (!changedFields.length) {
            // nothing changed, so we can just pop the editing state
            this.props.editing.pop(true);
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.#commitTask = this.context.createTask('congresses/updateProgram', {
                congress: this.congress,
                instance: this.instance,
                id: this.id,
                _changedFields: changedFields,
            }, this.state.edit);
            this.#commitTask.on('success', this.onEndEdit);
            this.#commitTask.on('drop', () => {
                this.#commitTask = null;
                resolve();
            });
        });
    };
    onEndEdit = () => {
        this.props.editing && this.props.editing.pop(true);
        this.setState({ edit: null });
    };

    get congress () {
        return +this.props.matches.congress[1];
    }
    get instance () {
        return +this.props.matches.instance[1];
    }
    get id () {
        return +this.props.match[1];
    }

    render ({ perms, push, editing }, { org, tz }) {
        const { congress, instance, id } = this;

        const actions = [];

        if (perms.hasPerm(`congress_instances.update.${org}`)) {
            actions.push({
                label: locale.update.menuItem,
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                action: () => push('redakti', true),
            }, {
                icon: <CopyIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.duplicateMenuItem,
                action: () => {
                    // this viewData will likely be instantaneous since the program has already
                    // been loaded by the detail view, so we probably don't need to show
                    // any loading indicator
                    this.context.viewData('congresses/program', {
                        congress, instance, id,
                    }).then(data => {
                        this.context.createTask('congresses/createProgram', {
                            congress, instance,
                        }, data);
                    }).catch(err => {
                        // oh well
                        console.error(err); // eslint-disable-line no-console
                    });
                },
            },
            {
                label: locale.delete.menuItem,
                overflow: true,
                action: () => this.context.createTask('congresses/deleteProgram', {
                    congress, instance, id,
                }),
                danger: true,
            });
        }

        return (
            <div class="congress-program-detail">
                <Meta
                    title={locale.detailTitle}
                    actions={actions} />
                <DetailShell
                    view="congresses/program"
                    id={id}
                    options={{ congress, instance }}
                    editing={editing}
                    edit={this.state.edit}
                    onEditChange={edit => this.setState({ edit })}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()}>
                    {data => (
                        <DetailInner
                            data={data}
                            editing={editing}
                            edit={this.state.edit}
                            onEditChange={edit => this.setState({ edit })}
                            congress={congress}
                            instance={instance}
                            program={id}
                            tz={tz} />
                    )}
                </DetailShell>
                <DetailShell
                    /* this is kind of a hack to get the org field */
                    view="congresses/congress"
                    id={congress}
                    fields={{}}
                    locale={{}}
                    onData={data => data && this.setState({ org: data.org })} />
                <DetailShell
                    /* a hack to get the tz field */
                    view="congresses/instance"
                    options={{ congress }}
                    id={instance}
                    fields={{}}
                    locale={{}}
                    onData={data => data && this.setState({ tz: data.tz })} />
            </div>
        );
    }
});

export function DetailInner ({ data, editing, edit, onEditChange, congress, instance, program, tz }) {
    return (
        <DetailFields
            data={data}
            editing={editing}
            edit={edit}
            onEditChange={onEditChange}
            locale={locale}
            header={Header}
            fields={FIELDS}
            userData={{ congress, instance, program, tz }} />
    );
}

function Header ({ item, userData }) {
    if (!item) return null;
    const { congress, instance, program } = userData;

    return (
        <div class="congress-program-header">
            <div class="program-title">
                <MdField value={item.title} singleLine rules={['emphasis', 'strikethrough']} />
            </div>
            <TagManager
                list="congresses/listProgramTags"
                selected="congresses/listTagsOfProgram"
                options={{ congress, instance, program }}
                view="congresses/programTag"
                viewOptions={{ congress, instance }}
                taskOptions={{ congress, instance, program }}
                addTask="congresses/createProgramTag"
                updateTask="congresses/updateProgramTag"
                deleteTask="congresses/deleteProgramTag"
                attachTask="congresses/addTagToProgram"
                removeTask="congresses/removeTagFromProgram" />
        </div>
    );
}
