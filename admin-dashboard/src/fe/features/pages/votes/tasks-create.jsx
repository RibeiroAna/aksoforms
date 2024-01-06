import { h, Component } from 'preact';
import { useEffect } from 'preact/compat';
import { Button, TextField } from 'yamdl';
import DialogSheet from '../../../components/tasks/dialog-sheet';
import ProgressIndicator from '../../../components/dialog-progress-indicator';
import FadingPageView from '../../../components/layout/fading-page-view';
import DisplayError from '../../../components/utils/error';
import { Form, Field } from '../../../components/form';
import { org } from '../../../components/data';
import { votes as locale } from '../../../locale';
import {
    config as Config,
    timeStart as TimeStart,
    timeEnd as TimeEnd,
    voterCodeholders as VoterCodeholders,
    viewerCodeholders as ViewerCodeholders,
} from './config';
import { routerContext } from '../../../router';
import { connectPerms } from '../../../perms';
import { deepMerge } from '../../../../util';

function WizardPage ({ children, next }) {
    return (
        <Form class="wizard-page" onSubmit={next[1]}>
            {children}
            <footer class="page-footer">
                <span />
                {next[0]}
            </footer>
        </Form>
    );
}

function WizardSection ({ title }) {
    return (
        <div class="wizard-title">
            {title}
        </div>
    );
}

function WizardSelector ({ value, onChange, items, vertical }) {
    return (
        <Field
            validate={() => {
                if (value === null) {
                    return locale.create.requiresSelection;
                }
            }}
            class={'votes-wizard-selector' + (vertical ? ' is-vertical' : '')}>
            <div class="selector-items">
                {items.map((item, i) => (
                    <Button
                        key={i}
                        onClick={() => onChange(item.value)}
                        class={'wizard-selector-item'
                            + (item.value === value ? ' selected' : '')
                            + (item.icon ? ' icon-container' : '')}>
                        {item.contents}
                    </Button>
                ))}
            </div>
        </Field>
    );
}

function OrgPicker ({ value, onChange }) {
    return (
        <div class="org-picker">
            <WizardSection title={locale.fields.org} />
            <org.editor value={value} onChange={onChange} orgs={['uea', 'tejo']} />
        </div>
    );
}

function TypePicker ({ value, onChange }) {
    return (
        <div class="type-picker">
            <WizardSection title={locale.fields.type} />
            <WizardSelector
                title={locale.fields.type}
                value={value}
                onChange={onChange}
                vertical
                items={Object.keys(locale.types).map(type => ({
                    value: type,
                    contents: locale.types[type],
                }))} />
        </div>
    );
}

function TimespanEditor ({ value, onChange }) {
    return (
        <Field class="timespan-editor" validate={() => {
            if (value.start >= value.end) return locale.create.emptyTimespan;
        }}>
            <WizardSection title={locale.fields.timeStart} />
            <TimeStart
                editing outline
                item={value}
                value={value.start}
                onChange={start => onChange({ ...value, start })} />
            <br />
            <br />
            <WizardSection title={locale.fields.timeEnd} />
            <TimeEnd
                editing outline
                item={value}
                value={value.end}
                onChange={end => onChange({ ...value, end })}
                copyFrom="start" />
        </Field>
    );
}

const templatePage = () => ({
    id: 'template',
    page: connectPerms(function TemplatePage ({ template: value, onTemplateChange: onChange, next, perms }) {
        const hasTejo = perms.hasPerm('votes.create.tejo');
        const hasUea = perms.hasPerm('votes.create.uea');

        if ((!hasTejo || !hasUea) && !value.org) {
            // set org field to the one the user has permission to create
            useEffect(() => {
                onChange({ ...value, org: hasUea ? 'uea' : 'tejo' });
            });
        }

        return (
            <WizardPage next={next}>
                <WizardSection title={locale.fields.name} />
                <Field>
                    <TextField
                        required
                        class="name-editor"
                        outline
                        value={value.name}
                        onChange={name => onChange({ ...value, name })} />
                </Field>
                <WizardSection title={locale.fields.description} />
                <Field>
                    <TextField
                        class="name-editor"
                        outline
                        value={value.description}
                        onChange={v => onChange({ ...value, description: v || null })} />
                </Field>
                {hasTejo && hasUea ? (
                    <OrgPicker
                        value={value.org}
                        onChange={org => onChange({ ...value, org })} />
                ) : null}
            </WizardPage>
        );
    }),
});

const generalPage = (isTemplate) => ({
    id: 'general',
    page: connectPerms(function GeneralPage ({ value, onChange, next, perms }) {
        const hasTejo = perms.hasPerm('votes.create.tejo');
        const hasUea = perms.hasPerm('votes.create.uea');

        if ((!hasTejo || !hasUea) && !value.org) {
            // set org field to the one the user has permission to create
            useEffect(() => {
                onChange({ ...value, org: hasUea ? 'uea' : 'tejo' });
            });
        }

        return (
            <WizardPage next={next}>
                <WizardSection title={locale.fields.name} />
                <TextField
                    required
                    class="name-editor"
                    outline
                    value={value.name}
                    onChange={name => onChange({ ...value, name })} />
                {hasTejo && hasUea && !isTemplate ? (
                    <OrgPicker
                        value={value.org}
                        onChange={org => onChange({ ...value, org })} />
                ) : null}
            </WizardPage>
        );
    }),
});

const votePage = (isTemplate) => ({
    id: 'vote',
    page: function VotePage ({ value, onChange, next }) {
        return (
            <WizardPage next={next}>
                <TypePicker
                    value={value.type}
                    onChange={type => onChange({ ...value, type })} />
                {isTemplate ? null : (
                    <TimespanEditor
                        value={value.timespan}
                        onChange={timespan => onChange({ ...value, timespan })} />
                )}
            </WizardPage>
        );
    },
});

const votersPage = () => ({
    id: 'voters',
    page: function VotersPage ({ value, onChange, next }) {
        return (
            <WizardPage next={next}>
                <p>
                    {locale.voterCodeholdersDescription}
                </p>
                <VoterCodeholders
                    value={value.voterCodeholders}
                    onChange={voterCodeholders => onChange({ ...value, voterCodeholders })}
                    item={value}
                    editing={true} />
                <WizardSection title={locale.fields.viewerCodeholders} />
                <p>
                    {locale.viewerCodeholdersDescription}
                </p>
                <ViewerCodeholders
                    value={value.viewerCodeholders}
                    onChange={viewerCodeholders => onChange({ ...value, viewerCodeholders })}
                    item={value}
                    editing={true} />
            </WizardPage>
        );
    },
});

const configPage = () => ({
    id: 'config',
    page: function ConfigPage ({ value, onChange, next }) {
        return (
            <WizardPage next={next}>
                <Config
                    value={value.config}
                    onChange={config => onChange({ ...value, config })}
                    editing={true}
                    item={value} />
            </WizardPage>
        );
    },
});

export default function makeCreateTask (isTemplate) {
    const pages = [
        generalPage(isTemplate),
        votersPage(isTemplate),
        votePage(isTemplate),
        configPage(isTemplate),
    ];

    if (isTemplate) {
        pages.unshift(templatePage());
    }

    return class CreateVote extends Component {
        state = {
            page: 0,
            template: {
                name: '',
                description: '',
                org: null,
            },
            vote: {
                name: '',
                org: null,
                type: null,
                state: {
                    isActive: false,
                },
                timespan: {
                    start: null,
                    end: null,
                },
                voterCodeholders: '{\n\t\n}',
                viewerCodeholders: 'null',
                config: {
                    quorum: 0,
                    quorumInclusive: true,
                    blankBallotsLimit: 0,
                    blankBallotsLimitInclusive: true,
                    majorityBallots: 0,
                    majorityBallotsInclusive: true,
                    majorityVoters: 0,
                    majorityVotersInclusive: true,
                    majorityMustReachBoth: true,
                    numChosenOptions: 1,
                    mentionThreshold: 0,
                    mentionThresholdInclusive: true,
                    maxOptionsPerBallot: null,
                    tieBreakerCodeholder: null,
                    publishVoters: false,
                    publishVotersPercentage: true,
                    options: [],
                    ballotsSecret: false,
                },
            },
            error: null,
        };

        static contextType = routerContext;

        componentDidMount () {
            if (!isTemplate && this.props.task.parameters.name) {
                // seems like we’re using a template! copy over data
                this.setState({
                    vote: deepMerge({ ...this.state.vote }, this.props.task.parameters),
                });
            }
        }

        render ({ open, task }, { page }) {
            const pageTitles = [];
            const pageContents = [];
            let pageIndex = 0;
            for (const p of pages) {
                const i = pageIndex;
                pageTitles.push(
                    <span key={p.id} onClick={() => {
                        if (page > i) this.setState({ page: i });
                    }}>
                        {locale.create.pages[p.id]}
                    </span>
                );

                const isLast = i + 1 === pages.length;
                const nextAction = () => {
                    if (isLast) {
                        task.update(isTemplate ? {
                            ...this.state.template,
                            vote: this.state.vote,
                        } : this.state.vote);
                        task.runOnce().then(id => {
                            if (isTemplate) {
                                this.context.navigate(`/vochdonoj/shablonoj/${id}`);
                            } else {
                                this.context.navigate(`/vochdonoj/${id}`);
                            }
                        }).catch(error => {
                            this.setState({ error });
                            console.error(error); // eslint-disable-line no-console
                        });
                        return;
                    }
                    this.setState({ page: i + 1 });
                };
                const nextButton = isLast ? (
                    <Button raised disabled={task.running} type="submit">
                        {locale.create.button}
                    </Button>
                ) : (
                    <Button raised type="submit">
                        {locale.create.continue}
                    </Button>
                );

                const Page = p.page;
                pageContents.push(
                    <Page
                        value={this.state.vote}
                        onChange={vote => this.setState({ vote })}
                        template={this.state.template}
                        onTemplateChange={template => this.setState({ template })}
                        next={[nextButton, nextAction]} />
                );
                pageIndex++;
            }

            return (
                <DialogSheet
                    backdrop
                    open={open}
                    onClose={() => task.drop()}
                    title={isTemplate ? locale.create.templateTitle : locale.create.title}
                    class="vote-creator-wizard"
                    fullScreen={width => width <= 420}>
                    <ProgressIndicator selected={page} onBack={() => {
                        if (page > 0) this.setState({ page: page - 1 });
                    }}>
                        {pageTitles}
                    </ProgressIndicator>
                    <FadingPageView selected={page}>
                        {pageContents}
                    </FadingPageView>
                    {this.state.error ? (
                        <div class="error-message-container">
                            <DisplayError error={this.state.error} />
                        </div>
                    ) : null}
                </DialogSheet>
            );
        }
    };
}
