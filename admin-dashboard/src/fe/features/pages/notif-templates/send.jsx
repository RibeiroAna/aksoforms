import { h } from 'preact';
import { lazy, Suspense, PureComponent } from 'preact/compat';
import { Button, Checkbox, CircularProgress } from 'yamdl';
import DialogSheet from '../../../components/tasks/dialog-sheet';
import { connectPerms } from '../../../perms';
import { coreContext } from '../../../core/connection';
import { notifTemplates as locale } from '../../../locale';
import './send.less';

const MagazineEditionPicker = lazy(() => import('../magazines/edition-picker'));
const NotifTemplatePicker = lazy(() => import('./picker'));

export default function SendNotifTemplate ({ options, open, onClose, lvIsCursed, context, jsonFilter, task }) {
    return (
        <DialogSheet
            backdrop
            class="send-notif-template-dialog"
            open={open}
            onClose={onClose}
            title={locale.send.title}>
            <Contents
                task={task}
                context={context}
                options={options}
                jsonFilter={jsonFilter}
                onClose={onClose}
                lvIsCursed={lvIsCursed} />
        </DialogSheet>
    );
}

const Contents = connectPerms(class Contents extends PureComponent {
    state = {
        template: null,
        templateData: null,
        deleteOnComplete: false,
        additionalParams: {},
    };

    static contextType = coreContext;

    onSubmit = () => {
        const task = this.context.createTask(this.props.task, this.props.options, {
            template: this.state.template,
            deleteOnComplete: this.state.deleteOnComplete,
            additionalParams: this.state.additionalParams,
        });
        task.on('success', () => {
            this.context.createTask('info', {
                message: locale.send.send.sent,
            });

            this.props.onClose();
        });
    };

    render ({ perms, lvIsCursed, context, jsonFilter }, { template, templateData }) {
        const contents = [];
        const intent = templateData?.intent;

        let canDeleteOnComplete = !!templateData;
        let canSend = !!templateData;
        if (intent === 'newsletter_magazine') {
            canDeleteOnComplete = false;
            canSend = this.state.additionalParams.magazineId && this.state.additionalParams.editionId;

            contents.push(
                <div class="magazine-params" key="params">
                    <p>
                        {locale.send.intentDescriptions.newsletterMagazine}
                    </p>
                    <Suspense fallback={(
                        <div class="notif-template-picker-loading">
                            <CircularProgress indeterminate />
                        </div>
                    )}>
                        <MagazineEditionPicker
                            magazineJsonFilter={{
                                org: templateData.org,
                            }}
                            magazine={this.state.additionalParams.magazineId}
                            edition={this.state.additionalParams.editionId}
                            onMagazineChange={magazineId => this.setState({
                                additionalParams: {
                                    ...this.state.additionalParams,
                                    magazineId,
                                },
                            })}
                            onEditionChange={editionId => this.setState({
                                additionalParams: {
                                    ...this.state.additionalParams,
                                    editionId,
                                },
                            })} />
                    </Suspense>
                </div>
            );
        }

        if (canDeleteOnComplete && perms.hasPerm(`notif_templates.delete.${templateData.org}`)) {
            const checkboxId = Math.random().toString(36);
            contents.push(
                <div class="send-option" key="deleteOnComplete">
                    <Checkbox
                        class="option-switch"
                        id={checkboxId}
                        checked={this.state.deleteOnComplete}
                        onChange={deleteOnComplete => this.setState({ deleteOnComplete })} />
                    <label for={checkboxId}>
                        {locale.send.deleteOnComplete}
                    </label>
                </div>
            );
        }

        if (canSend) {
            contents.push(
                <footer class="send-footer" key="send">
                    <div class="send-submit" key="submit">
                        <Button raised onClick={this.onSubmit}>
                            {locale.send.send.button}
                        </Button>
                    </div>
                </footer>
            );
        }

        return (
            <div class="codeholders-send-notif-template">
                {this.props.options.search?.query ? <div class="search-query-notice">
                    {locale.send.searchQueryNotice}
                </div> : null}
                {lvIsCursed ? <div class="cursed-notice">
                    {locale.send.cursedNotice}
                </div> : null}
                <p class="templates-description">
                    {locale.send.descriptions[context]}
                </p>
                <Suspense fallback={(
                    <div class="notif-template-picker-loading">
                        <CircularProgress indeterminate />
                    </div>
                )}>
                    <NotifTemplatePicker
                        jsonFilter={jsonFilter}
                        value={template}
                        onChange={template => this.setState({ template })}
                        onLoadData={templateData => {
                            const deleteOnComplete = (context === 'newsletter') && templateData?.intent === 'newsletter';

                            this.setState({
                                templateData,
                                deleteOnComplete,
                            });
                        }} />
                </Suspense>
                {contents}
            </div>
        );
    }
});
