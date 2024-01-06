import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Button, CircularProgress, Checkbox, Spring, globalAnimator } from 'yamdl';
import { connect } from '../../core/connection';
import { LinkButton } from '../../router';
import { layoutContext } from '../layout/dynamic-height-div';
import { search as searchLocale } from '../../locale';
import './overview-list-item.less';

const MAX_ICON_CELLS = 1;
const MAX_TITLE_CELLS = 3;
const MAX_TITLE_ALT_CELLS = 1;

export function lineLayout (fields, selectedFields, selection) {
    const fieldWeights = selectedFields.map(x => fields[x.id].weight || 1);
    let weightSum = fieldWeights.reduce((a, b) => a + b, 0);
    if (selection) weightSum += 0.5;
    const actualUnit = 100 / weightSum;
    const unit = Math.max(12, actualUnit);

    const totalWidth = Math.round(weightSum * unit);
    const extraPixels = fieldWeights.length * 8;

    const style = {
        gridTemplateColumns: fieldWeights.map(x => `calc(${x * actualUnit}% - 8px)`).join(' '),
        width: totalWidth > 100 ? `calc(${totalWidth}% + ${extraPixels}px)` : null,
    };
    if (selection) style.gridTemplateColumns = (actualUnit / 2) + '% ' + style.gridTemplateColumns;
    style.maxWidth = style.width;

    return style;
}

export default connect(props => ([props.view, {
    ...props.options,
    id: props.id,
    fields: props.selectedFields,
    noFetch: !props.doFetch,
}]))(data => ({ data }))(class ListItem extends PureComponent {
    #inTime = 0;
    #yOffset = new Spring(1, 0.5);
    #node = null;

    static contextType = layoutContext;

    componentDidMount () {
        if (this.props.lastCollapseTime > Date.now() - 500) this.#inTime = -0.5;

        globalAnimator.register(this);
    }

    getSnapshotBeforeUpdate (prevProps) {
        if (prevProps.index !== this.props.index) {
            return this.#node && this.#node.button ? this.#node.button.getBoundingClientRect() : null;
        }
        return null;
    }

    componentDidUpdate (prevProps, _, oldRect) {
        if (prevProps.index !== this.props.index && this.#node && oldRect) {
            const newRect = this.#node.button.getBoundingClientRect();
            this.#yOffset.value = oldRect.top - newRect.top;
            globalAnimator.register(this);
        }

        if (prevProps.expanded && !this.props.expanded) {
            this.#inTime = -0.5;
            globalAnimator.register(this);
        }

        if (!prevProps.data && this.props.data && this.context) {
            this.context();
        }
        if (this.props.data !== prevProps.data) {
            this.props.onData && this.props.onData(this.props.data);
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    update (dt) {
        this.#inTime += dt;
        this.#yOffset.update(dt);

        if (this.props.skipAnimation) {
            this.#yOffset.finish();
            this.#inTime = 5;
        }

        if (!this.#yOffset.wantsUpdate() && this.#inTime >= 5) {
            this.#inTime = 5;
            globalAnimator.deregister(this);
        }

        this.forceUpdate();
    }

    render ({
        id,
        compact,
        selectedFields,
        data,
        fields,
        onGetItemLink,
        outOfTree,
        onClick,
        index,
        locale,
        cursed,
        selection,
        animateBackwards,
        disabled,
        userData,
    }) {
        if (!data) return null;
        if (userData && userData.hideItem && userData.hideItem(data)) return null;

        // compact layout
        const iconCells = [];
        const titleCells = [];
        const titleAltCells = [];
        const bodyCells = [];

        // table layout
        const cells = [];

        const selectedFieldIds = selectedFields.map(x => x.id);

        for (const { id } of selectedFields) {
            let Component;
            if (fields[id]) Component = fields[id].component;
            else Component = () => `unknown field ${id}`;

            let slot = 'table';
            if (compact) {
                slot = fields[id].slot || 'body';

                if (slot === 'title' && titleCells.length < MAX_TITLE_CELLS) {
                    slot = 'title';
                } else if (slot === 'titleAlt' && titleAltCells.length < MAX_TITLE_ALT_CELLS) {
                    slot = 'titleAlt';
                } else if (slot === 'icon' && iconCells.length < MAX_ICON_CELLS) {
                    slot = 'icon';
                } else {
                    slot = 'body';
                }
            }

            const cell = (
                <div key={id} class="list-item-cell">
                    {fields[id].skipLabel ? null : (
                        <div class="cell-label">{locale[id]}</div>
                    )}
                    <Component
                        inline
                        slot={slot}
                        value={data[id]}
                        item={data}
                        fields={selectedFieldIds}
                        userData={userData} />
                </div>
            );

            if (compact) {
                if (slot === 'title') titleCells.push(cell);
                else if (slot === 'titleAlt') titleAltCells.push(cell);
                else if (slot === 'body') bodyCells.push(cell);
                else if (slot === 'icon') iconCells.push(cell);
            } else {
                cells.push(cell);
            }
        }

        let emptyNotice = null;
        if (!selectedFields.length) {
            emptyNotice = (
                <div class="list-item-empty">
                    {searchLocale.noFieldsSelected}
                </div>
            );
        }

        if (selection) {
            const hasItem = selection.has(id);
            const boxCell = (
                <div key="selection" class="list-item-cell selection-cell" onClick={e => {
                    // FIXME: hacky because we need to prevent the link from doing stuff
                    e.stopPropagation();
                    e.preventDefault();
                    if (selection.has(id)) selection.delete(id);
                    else selection.add(id);
                }}>
                    {hasItem === null ? <CircularProgress small indeterminate /> : (
                        <Checkbox
                            checked={selection.has(id)} />
                    )}
                </div>
            );
            if (compact) {
                titleCells.unshift(boxCell);
            } else {
                cells.unshift(boxCell);
            }
        }

        const style = lineLayout(fields, selectedFields, selection);

        const animScale = animateBackwards ? -1 : 1;
        const constOffset = this.#inTime === 5 ? 0 : 15 * Math.exp(-10 * this.#inTime);
        const spreadFactor = this.#inTime === 5 ? 0 : 4 * Math.exp(-10 * this.#inTime);
        const yOffset = this.#yOffset.value;

        Object.assign(style, {
            transform: `translateY(${animScale * (constOffset + spreadFactor * index) * 10 + yOffset}px)`,
            opacity: Math.max(0, Math.min(1 - spreadFactor * index / 2, 1)),
        });

        if (userData && userData.itemStyle) Object.assign(style, userData.itemStyle(data));
        if (userData && userData.getCursed) cursed = cursed || userData.getCursed(data);

        const itemLink = onGetItemLink ? onGetItemLink(id, data) : null;
        const ItemComponent = onGetItemLink ? LinkButton : onClick ? Button : 'div';

        return (
            <ItemComponent
                target={itemLink}
                outOfTree={outOfTree}
                class={'overview-list-item' + (cursed ? ' is-cursed' : '') + (compact ? ' is-compact' : '')}
                style={style}
                ref={node => this.#node = node}
                disabled={disabled}
                onClick={e => {
                    // don’t keep focus on what is essentially button
                    e.currentTarget.blur();
                    if (onClick) onClick(e);
                }}>
                {!!(compact && iconCells.length) && (
                    <div class="li-compact-icon">
                        {iconCells}
                    </div>
                )}
                {compact ? (
                    <div class="li-compact-inner">
                        <div class="li-compact-title">
                            <div class="li-compact-title-inner">
                                {titleCells}
                            </div>
                            <div class="li-compact-title-alt">
                                {titleAltCells}
                            </div>
                        </div>
                        <div class="li-compact-body">
                            {bodyCells}
                        </div>
                    </div>
                ) : cells}
                {emptyNotice}
            </ItemComponent>
        );
    }
});
