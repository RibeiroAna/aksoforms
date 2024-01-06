import { h } from 'preact';
import { useState } from 'preact/compat';
import { Checkbox, CircularProgress } from 'yamdl';
import EditIcon from '@material-ui/icons/Edit';
import SearchIcon from '@material-ui/icons/Search';
import fuzzaldrin from 'fuzzaldrin';
import Page from '../../../../components/page';
import { CountryFlag } from '../../../../components/data/country';
import DetailView from '../../../../components/detail/detail';
import RearrangingList from '../../../../components/lists/rearranging-list';
import Meta from '../../../meta';
import { connect, coreContext } from '../../../../core/connection';
import { connectPerms } from '../../../../perms';
import { FIELDS } from './fields';
import { countryGroups as locale, detail as detailLocale } from '../../../../locale';
import './style.less';

export default connectPerms(class CountryGroupPage extends Page {
    static contextType = coreContext;

    state = {
        edit: null,
    };

    onEndEdit = () => {
        this.props.editing && this.props.editing.pop(true);
        this.setState({ edit: null });
    };

    #commitTask = null;
    onCommit = changedFields => {
        if (!this.props.editing || this.#commitTask) return Promise.resolve();
        if (!changedFields.length) {
            // nothing changed, so we can just pop the editing state
            this.props.editing.pop(true);
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.#commitTask = this.context.createTask('countries/updateGroup', {
                id: this.props.match[1],
                _changedFields: changedFields,
            }, this.state.edit);
            this.#commitTask.on('success', this.onEndEdit);
            this.#commitTask.on('drop', () => {
                this.#commitTask = null;
                resolve();
            });
        });
    };

    componentWillUnmount () {
        if (this.#commitTask) this.#commitTask.drop();
    }

    render ({ perms, match, editing }, { edit }) {
        const id = match[1];

        const actions = [];

        if (perms.hasPerm('country_groups.update')) {
            actions.push({
                label: detailLocale.edit,
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                action: () => this.props.onNavigate(`/administrado/landaroj/${id}/redakti`, true),
            });
        }

        if (perms.hasPerm('country_groups.delete')) {
            actions.push({
                label: detailLocale.delete,
                action: () => this.context.createTask('countries/deleteGroup', {}, { id }),
                overflow: true,
                danger: true,
            });
        }

        return (
            <div class="country-group-page">
                <Meta
                    title={locale.detailTitle}
                    actions={actions} />
                <DetailView
                    view="countries/group"
                    id={id}
                    fields={FIELDS}
                    footer={Footer}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit} />
            </div>
        );
    }
});

const Footer = connect('countries/countries')(countries => ({
    countries,
}))(function Footer ({ countries, item, editing }) {
    if (!countries || !item.countries) return null;

    const [tentativeMemberships, setTentativeMemberships] = useState({});
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCountries = searchQuery
        ? fuzzaldrin.filter(Object.keys(countries).map(code => ({
            code,
            name: countries[code].name_eo,
        })), searchQuery, { key: 'name' }).map(({ code }) => code)
        : Object.keys(countries);

    const countryItems = [];

    for (const code of filteredCountries) {
        const isMember = item.countries.includes(code);
        if (!editing && !isMember) continue;

        const name = countries[code].name_eo;

        const setTentativeMembership = membership => {
            const tm = { ...tentativeMemberships };
            if (membership === true || membership === false) {
                tm[code] = membership;
            } else {
                delete tm[code];
            }
            setTentativeMemberships(tm);
        };

        countryItems.push(
            <CountryItem
                key={code}
                group={item.code}
                code={code}
                name={name}
                isMember={isMember}
                editing={editing}
                setTentativeMembership={setTentativeMembership} />,
        );
    }

    // this is a rearranging list because they have good support for filtering
    return (
        <div class="countries-list-container">
            <div class="countries-list-search">
                <div class="countries-list-search-icon">
                    <SearchIcon style={{ verticalAlign: 'middle' }} />
                </div>
                <input
                    value={searchQuery}
                    placeholder={locale.detailSearchPlaceholder}
                    onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <RearrangingList
                class="countries-list"
                itemHeight={56}
                isItemDraggable={() => false}
                canMove={() => false}>
                {countryItems}
            </RearrangingList>
        </div>
    );
});

function CountryItem ({ group, code, name, editing, isMember, setTentativeMembership }) {
    const [currentTask, setCurrentTask] = useState(null);

    return (
        <coreContext.Consumer>
            {core => {
                const onClick = () => {
                    if (!editing || currentTask) return;
                    let task;
                    if (!isMember) {
                        task = core.createTask('countries/addGroupCountry', {
                            group,
                        }, {
                            country: code,
                        });
                        setTentativeMembership(true);
                    } else {
                        task = core.createTask('countries/removeGroupCountry', {
                            group,
                        }, {
                            country: code,
                        });
                        setTentativeMembership(false);
                    }
                    setCurrentTask(task);
                    task.runOnceAndDrop().catch(err => {
                        console.error(err); // eslint-disable-line no-console
                    }).then(() => {
                        setTentativeMembership(null);
                        setCurrentTask(null);
                    });
                };

                return (
                    <div
                        class="country-item"
                        disabled={!!currentTask}>
                        <div class="country-checkbox-container">
                            {currentTask
                                ? <CircularProgress indeterminate small />
                                : editing
                                    ? <Checkbox
                                        checked={isMember}
                                        onClick={onClick} />
                                    : null}
                        </div>
                        <CountryFlag country={code} />
                        {name}
                    </div>
                );
            }}
        </coreContext.Consumer>
    );
}
