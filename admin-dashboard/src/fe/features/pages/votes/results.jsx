import { h, Component } from 'preact';
import { useContext, useRef, useState } from 'preact/compat';
import dagre from 'dagre';
import { CircularProgress } from 'yamdl';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import domToImage from 'dom-to-image-more';
import { useDataView } from '../../../core';
import Page from '../../../components/page';
import TaskButton from '../../../components/controls/task-button';
import Meta from '../../meta';
import { coreContext } from '../../../core/connection';
import { IdUEACode } from '../../../components/data/uea-code';
import DisplayError from '../../../components/utils/error';
import { Link } from '../../../router';
import { votes as locale } from '../../../locale';
import './results.less';

export default class VoteResultsPage extends Page {
    render () {
        return (
            <div class="vote-results-page">
                <Meta
                    title={locale.results.title} />
                <VoteResults id={this.props.matches.vote[1]} />
            </div>
        );
    }
}

function VoteResults ({ id }) {
    const core = useContext(coreContext);
    const [loading1, error1, vote] = useDataView('votes/vote', { id, fields: ['config'] });
    const [loading2, error2, data] = useDataView('votes/voteResults', { id });
    const containerNode = useRef(null);

    if (loading1 || loading2) {
        return (
            <div class="vote-results is-loading">
                <CircularProgress indeterminate />
            </div>
        );
    } else if (error1 || error2) {
        return (
            <div class="vote-results has-error">
                <DisplayError error={error2 || error1} />
            </div>
        );
    } else if (!data || !vote) {
        return null;
    }

    let content = null;
    if (data.type === 'yn' || data.type === 'ynb') {
        content = <YnbContent data={data} />;
    } else if (data.type === 'rp') {
        content = <RpContent config={vote.config} data={data} />;
    } else if (data.type === 'stv') {
        content = <StvContent config={vote.config} data={data} />;
    } else {
        content = <TmContent config={vote.config} data={data} />;
    }

    const [exporting, setExporting] = useState(false);

    const exportAsImage = async () => {
        const width = containerNode.current.offsetWidth;
        const height = containerNode.current.offsetHeight;

        await new Promise(resolve => {
            setExporting(true);
            setTimeout(() => {
                resolve();
            }, 100);
        });

        await domToImage.toPng(containerNode.current, {
            width: width * 2,
            height: height * 2,
            style: {
                transform: 'scale(2)',
                transformOrigin: '0 0',
            },
        }).then(src => {
            const a = document.createElement('a');
            a.href = src;
            a.download = locale.results.exportAsImageFileName + '.png';
            a.click();
        }).catch(err => {
            core.createTask('info', {
                title: locale.results.exportAsImageError,
                message: err.toString(),
            });
        });

        setExporting(false);
    };

    return (
        <div class="vote-results">
            <div class="results-bar">
                <TaskButton run={exportAsImage}>
                    {locale.results.exportAsImage}
                </TaskButton>
            </div>

            <div class={'inner-results' + (exporting ? ' is-exporting' : '')} ref={containerNode}>
                <ResultStatus data={data} />
                <ResultSummary data={data} config={vote.config} />
                {data.ballots ? <ResultBallots type={data.type} ballots={data.ballots} /> : null}
                {data.mentions ? <ResultMentions config={vote.config} ballots={data.ballots} mentions={data.mentions} tmInfo={data.type === 'tm' ? data.value : null} /> : null}
                {content}
            </div>
        </div>
    );
}

function ResultStatus ({ data }) {
    return (
        <h1 class="result-status">
            {locale.results.statuses[data.status]}
        </h1>
    );
}

function ResultBallots ({ type, ballots }) {
    const canHaveBlanks = type !== 'yn';

    return (
        <div class="result-ballots">
            <h2>
                {locale.results.ballots.title}
            </h2>
            <div class="stat-line">
                {locale.results.ballots.voters(ballots.count)}
            </div>
            {canHaveBlanks && (
                <div class="stat-line">
                    {locale.results.ballots.blanks(ballots.blank)}
                </div>
            )}
            <div class="stat-line">
                {locale.results.ballots.nonVoters(ballots.voters - ballots.count)}
            </div>
        </div>
    );
}

function OptionName ({ option }) {
    if (option.type === 'simple') {
        return option.name;
    } else if (option.type === 'codeholder') {
        return (
            <Link class="option-codeholder-link" target={`/membroj/${option.codeholderId}`} outOfTree>
                <IdUEACode id={option.codeholderId} />
            </Link>
        );
    }
    return '???';
}

function ResultSummary ({ data, config }) {
    if (data.status !== 'success') return null;

    if (data.type === 'yn' || data.type === 'ynb') {
        const { pass } = data.value;
        const iPass = <CheckIcon style={{ verticalAlign: 'middle' }} />;
        const iFail = <CloseIcon style={{ verticalAlign: 'middle' }} />;

        return (
            <div class="result-summary is-ynb">
                <div class="ynb-condition is-result" data-passed={pass.result}>
                    <div class="condition-icon">
                        {pass.result ? iPass : iFail}
                    </div>
                    <div class="condition-label">
                        {pass.result
                            ? locale.results.ynbResults.resultPass
                            : locale.results.ynbResults.resultFail}
                    </div>
                </div>
                <div class="ynb-condition" data-passed={pass.voters}>
                    <div class="condition-icon">
                        {pass.voters ? iPass : iFail}
                    </div>
                    <div class="condition-label">
                        {pass.voters
                            ? locale.results.ynbResults.votersPass
                            : locale.results.ynbResults.votersFail}
                    </div>
                </div>
                <div class="ynb-condition" data-passed={pass.majority}>
                    <div class="condition-icon">
                        {pass.majority ? iPass : iFail}
                    </div>
                    <div class="condition-label">
                        {pass.majority
                            ? locale.results.ynbResults.majorityPass
                            : locale.results.ynbResults.majorityFail}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div class="result-summary is-winners">
            <h2>{locale.results.winners}</h2>
            <OptionList options={config.options} ids={data.value.winners} />
        </div>
    );
}

function OptionList ({ options, ids }) {
    if (!ids.length) {
        return (
            <div class="option-list is-empty">
                {locale.results.optionListEmpty}
            </div>
        );
    }

    return (
        <ul class="option-list">
            {ids.map((node, i) => (
                <li key={i} class="inner-item">
                    <OptionName option={options[node]} />
                </li>
            ))}
        </ul>
    );
}

function rationalToFloat (r) {
    if (Array.isArray(r)) return r[0] / r[1];
    return r;
}

function ResultMentions ({ config, ballots, mentions, tmInfo }) {
    const candidates = mentions.includedByMentions.concat(mentions.excludedByMentions);
    let maxMentions = 1; // we initialize this to 1 so we dont divide by zero
    for (const cand of candidates) {
        maxMentions = Math.max(mentions.mentions[cand] || 0, maxMentions);
    }
    const mentionThreshold = ('mentionThreshold' in config)
        ? rationalToFloat(config.mentionThreshold) * ballots.count
        : 0;
    maxMentions = Math.max(mentionThreshold * 1.2, maxMentions);

    const entries = [];
    for (const candidate of candidates) {
        const isIncluded = mentions.includedByMentions.includes(candidate);
        const count = mentions.mentions[candidate] || 0;
        const innerLabel = isIncluded
            ? locale.results.mentions.candidateIncludedWithCount(count)
            : locale.results.mentions.candidateExcludedWithCount(count);

        entries.push({
            label: <OptionName option={config.options[candidate]} />,
            innerLabel,
            value: count,
            marked: isIncluded,
            candidate,
        });
    }

    if (tmInfo) {
        // change display for TM: sort & mark winners only
        entries.sort((a, b) => b.value - a.value);
        for (const entry of entries) {
            entry.marked = tmInfo.winners.includes(entry.candidate);
        }
    }

    return (
        <div class="result-mentions">
            <BarChart
                entries={entries}
                threshold={mentionThreshold}
                max={maxMentions} />
        </div>
    );
}

function YnbContent ({ data }) {
    if (data.status !== 'success') return null;

    const { tally } = data.value;
    const max = Math.max(tally.yes, tally.no, tally.blank);

    return (
        <BarChart2 ymax={max} items={[
            {
                name: locale.results.ynbOptions.yes,
                value: tally.yes,
            },
            {
                name: locale.results.ynbOptions.no,
                value: tally.no,
            },
            data.type === 'ynb' ? {
                name: locale.results.ynbOptions.blank,
                value: tally.blank,
            } : null,
        ].filter(x => x)} showPercentage />
    );
}

function RpContent ({ data, config }) {
    if (data.status === 'tie-breaker-needed') {
        return (
            <div class="rp-value is-tied-pairs">
                <p>
                    {locale.results.rpTieBreakerNeeded.description}
                </p>
                <ul>
                    {data.pairs.map(([a, b], i) => (
                        <li key={i}>
                            <OptionName option={config.options[a]} />
                            {' ↔ '}
                            <OptionName option={config.options[b]} />
                        </li>
                    ))}
                </ul>
            </div>
        );
    } else if (data.status === 'success') {
        return (
            <div class="rp-value is-success">
                <h2>{locale.results.rpRounds.title}</h2>
                <ul class="rp-rounds">
                    {data.value.rounds.map((round, i) => (
                        <RpRound key={i} round={round} options={config.options} />
                    ))}
                </ul>
            </div>
        );
    }

    return null;
}

function StvContent ({ data, config }) {
    if (data.status === 'tie-breaker-needed') {
        return (
            <div class="stv-value is-tied-nodes">
                <p>
                    {locale.results.stvTieBreakerNeeded.description}
                </p>
                <ul>
                    {data.tiedNodes.map((node, i) => (
                        <li key={i}>
                            <OptionName option={config.options[node]} />
                        </li>
                    ))}
                </ul>
            </div>
        );
    } else if (data.status === 'success') {
        const events = [];
        const eliminated = [];

        for (const event of data.value.events) {
            events.push(
                <li key={events.length} class="stv-event-container">
                    <StvEvent
                        eliminated={eliminated.slice()}
                        event={event}
                        options={config.options} />
                </li>
            );

            if (event.type === 'eliminate') {
                eliminated.push(event.candidate);
            }
        }

        return (
            <div class="stv-value is-success">
                <ul class="stv-events">
                    {events}
                </ul>
            </div>
        );
    }

    return null;
}

function TmContent ({ data, config }) {
    if (data.status === 'tie') {
        return (
            <div class="tm-value is-tie">
                <h2>{locale.results.tmTie.title}</h2>
                <OptionList options={config.options} ids={data.tiedNodes} />
                <h3>{locale.results.tmTie.sortedNodes}</h3>
                <BarChart
                    max={data.sortedNodes.map(node => data.mentions.mentions[node] || 0).reduce((a, b) => Math.max(a, b), 0)}
                    threshold={0}
                    entries={data.sortedNodes.map(node => ({
                        label: <OptionName option={config.options[node]} />,
                        innerLabel: data.tiedNodes.includes(node)
                            ? locale.results.tmTie.nodeIsTied
                            : '\u00a0',
                        value: data.mentions.mentions[node] || 0,
                        marked: data.tiedNodes.includes(node),
                    }))} />
            </div>
        );
    }

    return null;
}

function RpRound ({ round, options }) {
    return (
        <div class="rp-round">
            <LockGraph
                lockGraphEdges={round.lockGraphEdges}
                orderedPairs={round.orderedPairs}
                options={options}
                winner={round.winner} />
        </div>
    );
}

function StvEvent ({ event, options, eliminated }) {
    if (event.type === 'elect-with-quota') {
        return (
            <div class="stv-event is-elect-with-quota">
                <h3>{locale.results.stvEvents.electWithQuota(+event.quota.toFixed(3))}</h3>
                <p>
                    {locale.results.stvEvents.electWithQuotaDescription}
                </p>
                <p>
                    {locale.results.stvEvents.electingValuesDescription}
                </p>
                <StvValues values={event.values} options={options} chosen={event.elected} quota={event.quota} eliminated={eliminated} />
                <h4>{locale.results.stvEvents.elected}</h4>
                <OptionList options={options} ids={event.elected} />
            </div>
        );
    } else if (event.type === 'elect-rest') {
        return (
            <div class="stv-event is-elect-rest">
                <h3>{locale.results.stvEvents.electRest}</h3>
                <p>
                    {locale.results.stvEvents.electRestDescription}
                </p>
                <OptionList options={options} ids={event.elected} />
            </div>
        );
    } else if (event.type === 'eliminate') {
        return (
            <div class="stv-event is-eliminate">
                <h3>{locale.results.stvEvents.eliminate}</h3>
                <p>
                    {locale.results.stvEvents.eliminateDescription}
                </p>
                <h4>{locale.results.stvEvents.eliminated}</h4>
                <OptionList options={options} ids={[event.candidate]} />
                <p>
                    {locale.results.stvEvents.eliminatedValuesDescription}
                </p>
                <StvValues values={event.values} options={options} chosen={[event.candidate]} eliminated={eliminated} />
            </div>
        );
    }

    return null;
}

function StvValues ({ values, chosen, options, eliminated, quota }) {
    let max = 0;
    const entries = [];
    for (const k in values) {
        if (eliminated.includes(+k)) continue;

        max = Math.max(values[k], max);
        entries.push({
            label: <OptionName option={options[k]} />,
            innerLabel: +values[k].toFixed(3),
            value: values[k],
            marked: chosen?.includes(+k),
        });
    }

    return (
        <div class="stv-values">
            <BarChart max={max} entries={entries} threshold={quota || 0} />
        </div>
    );
}

/** Renders the lock graph and ranked pairs info for a round. */
class LockGraph extends Component {
    state = {
        nodes: [],
        edges: [],
        selectedEdge: null,
    };

    static contextType = coreContext;

    layoutLock = 0;

    /** Performs graph layout. */
    async layout (lock) {
        const core = this.context;

        const g = new dagre.graphlib.Graph();
        g.setGraph({});
        g.setDefaultEdgeLabel(() => ({}));

        const nodeIds = new Set();
        for (const { from: a, to: b } of this.props.lockGraphEdges) {
            nodeIds.add(a);
            nodeIds.add(b);
        }

        const optionLabels = {};
        for (const node of nodeIds) {
            const option = this.props.options[node];
            if (option.type === 'simple') {
                optionLabels[node] = option.name;
            } else if (option.type === 'codeholder') {
                optionLabels[node] = core.viewData('codeholders/codeholder', {
                    id: option.codeholderId,
                    fields: ['code'],
                    lazyFetch: true,
                }).then(data => {
                    return data.code.new;
                });
            }
        }

        for (const node of nodeIds) {
            let label;
            if (typeof optionLabels[node] === 'string') label = optionLabels[node];
            else label = await optionLabels[node];

            g.setNode('' + node, {
                id: node,
                label,
                width: Math.max(30, label.length * 12), // heuristic approximation of node width
                height: 30,
            });
        }

        for (const { from: a, to: b } of this.props.lockGraphEdges) {
            g.setEdge('' + a, '' + b, {
                fromNode: a,
                toNode: b,
            });
        }

        dagre.layout(g);

        const nodes = g.nodes().map(v => g.node(v));
        const edges = g.edges().map(e => g.edge(e));

        const xs = nodes.flatMap(node => [node.x - node.width / 2, node.x + node.width / 2])
            .concat(edges.flatMap(edge => edge.points).map(p => p.x));
        const ys = nodes.flatMap(node => [node.y - node.height / 2, node.y + node.height / 2])
            .concat(edges.flatMap(edge => edge.points).map(p => p.y));
        const minX = xs.reduce((a, b) => a < b ? a : b, Infinity);
        const minY = ys.reduce((a, b) => a < b ? a : b, Infinity);
        const maxX = xs.reduce((a, b) => a > b ? a : b, -Infinity);
        const maxY = ys.reduce((a, b) => a > b ? a : b, -Infinity);

        if (lock !== this.layoutLock) return;
        this.setState({ nodes, edges, minX, minY, maxX, maxY });
    }

    componentDidMount () {
        this.layout(++this.layoutLock);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.graph !== this.props.graph) this.layout(++this.layoutLock);
    }

    render ({ options, orderedPairs, lockGraphEdges, winner }, { nodes, edges, minX, minY, maxX, maxY, selectedEdge }) {
        if (!nodes.length) return null;

        const margin = 20;
        const viewX = minX - margin;
        const viewY = minY - margin;
        const viewW = maxX - minX + 2 * margin;
        const viewH = maxY - minY + 2 * margin;

        const svgNodes = [];
        const svgEdges = [];

        for (const edge of edges) {
            let d = '';
            for (const point of edge.points) {
                if (!d) d += `M ${point.x} ${point.y}`;
                else d += `L ${point.x} ${point.y}`;
            }

            // add arrow
            if (edge.points.length >= 2) {
                const a = edge.points[edge.points.length - 2];
                const b = edge.points[edge.points.length - 1];
                const angle = Math.atan2(b.y - a.y, b.x - a.x);
                const arrowAngleOffset = Math.PI / 7;
                const arrowSize = 10;
                const arrowAngleA = angle + Math.PI + arrowAngleOffset;
                const arrowAngleB = angle + Math.PI - arrowAngleOffset;
                d += `M ${b.x + Math.cos(arrowAngleA) * arrowSize} ${b.y + Math.sin(arrowAngleA) * arrowSize}`;
                d += `L ${b.x} ${b.y}`;
                d += `L ${b.x + Math.cos(arrowAngleB) * arrowSize} ${b.y + Math.sin(arrowAngleB) * arrowSize}`;
            }

            const edgeName = `${edge.fromNode}-${edge.toNode}`;
            const isSelected = edgeName === selectedEdge;
            const select = () => this.setState({ selectedEdge: edgeName });

            const className = isSelected ? ' is-selected' : '';

            svgEdges.push(<path class="lock-graph-edge-hitbox" d={d} onClick={select} />);
            svgEdges.push(<path class={'lock-graph-edge ' + className} d={d} />);
        }

        for (const node of nodes) {
            const isWinner = winner === node.id;

            svgNodes.push(
                <rect
                    class={'lock-graph-node-background' + (isWinner ? ' is-winner' : '')}
                    x={node.x - node.width / 2}
                    y={node.y - node.height / 2}
                    width={node.width}
                    height={node.height}
                    rx={4} />,
                <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    class={'lock-graph-node-label' + (isWinner ? ' is-winner' : '')}>
                    {node.label}
                </text>
            );
        }

        return (
            <div class="result-lock-graph-container">
                <OrderedPairs
                    options={options}
                    orderedPairs={orderedPairs}
                    lockGraphEdges={lockGraphEdges}
                    selectedEdge={selectedEdge} />
                <div class="inner-lock-graph-container">
                    <svg class="result-lock-graph" width={viewW} viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}>
                        {svgEdges}
                        {svgNodes}
                    </svg>
                </div>
            </div>
        );
    }
}

function OrderedPairs ({ options, orderedPairs, lockGraphEdges, selectedEdge }) {
    const edge = (selectedEdge || '').split('-').map(x => +x);

    const tableRows = [];
    for (const [a, b] of orderedPairs) {
        let lockGraphEdge = null;
        for (const item of lockGraphEdges) {
            if (item.from === a && item.to === b || item.from === b && item.to === a) {
                lockGraphEdge = item;
                break;
            }
        }

        const selected = edge[0] === a && edge[1] === b
            || edge[0] === b && edge[1] === a;

        tableRows.push({
            cells: [
                <span key="a">
                    <OptionName option={options[a]} />
                    {' ↔ '}
                    <OptionName option={options[b]} />
                </span>,
                lockGraphEdge ? <OptionName key="b" option={options[lockGraphEdge.from]} /> : null,
                lockGraphEdge ? `${Math.abs(lockGraphEdge.diff)}` : null,
            ],
            selected,
        });
    }

    return (
        <div class="ordered-pairs">
            <table class="ordered-pairs-table">
                <thead>
                    <tr>
                        <th>{locale.results.rpRounds.pair}</th>
                        <th>{locale.results.rpRounds.winner}</th>
                        <th>{locale.results.rpRounds.diff}</th>
                    </tr>
                </thead>
                <tbody>
                    {tableRows.map(({ cells, selected }, i) => (
                        <tr key={i} class={selected ? 'is-selected' : ''}>
                            {cells.map((d, i) => <td key={i}>{d}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function BarChart ({ entries, threshold, max }) {
    return (
        <table class="result-bar-chart">
            <tbody>
                {entries.map(({ value, label, innerLabel, marked }, i) => {
                    return (
                        <tr
                            class={'candidate-item' + (marked ? ' is-marked' : ' is-not-marked')}
                            key={i}>
                            <td class="candidate-name">
                                {label}
                            </td>
                            <td class="candidate-value">
                                <div class="inner-value">
                                    <div class="inner-label">
                                        {innerLabel}
                                    </div>
                                    <div class="min-bar" style={{ '--value': threshold / max }} />
                                    <div class="value-bar" style={{ '--value': value / max }}>
                                        <div class="inner-label">
                                            {innerLabel}
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function BarChart2 ({ ymax, items, showPercentage }) {
    const contents = [];

    for (const item of items) {
        const percentage = item.value !== null
            ? (ymax !== 0 ? item.value / ymax : 0)
            : 1;

        contents.push(
            <div class={'bar-chart-item' + (item.chosen ? ' was-chosen' : '') + (item.eliminated ? ' was-eliminated' : '')}>
                <div class="item-name">{item.name}</div>
                <div class="item-value">
                    {item.value}
                    {showPercentage ? ` (${+percentage.toFixed(2) * 100}%)` : ''}
                </div>
                <div class="item-description">{item.description}</div>
                {item.chosen ? <div class="item-chosen-check"><CheckIcon /></div> : null}
                <div class="item-bar" style={{ width: `${percentage * 100}%` }} />
            </div>
        );
    }

    return (
        <div class="result-bar-chart">
            {contents}
        </div>
    );
}

