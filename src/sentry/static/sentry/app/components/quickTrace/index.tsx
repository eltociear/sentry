import React from 'react';
import {browserHistory} from 'react-router';
import {Location, LocationDescriptor} from 'history';

import DropdownLink from 'app/components/dropdownLink';
import ProjectBadge from 'app/components/idBadge/projectBadge';
import {
  ErrorDestination,
  generateMultiTransactionsTarget,
  generateSingleErrorTarget,
  generateSingleTransactionTarget,
  TransactionDestination,
} from 'app/components/quickTrace/utils';
import Tooltip from 'app/components/tooltip';
import {IconFire} from 'app/icons';
import {t, tct, tn} from 'app/locale';
import {OrganizationSummary} from 'app/types';
import {Event} from 'app/types/event';
import {toTitleCase} from 'app/utils';
import {trackAnalyticsEvent} from 'app/utils/analytics';
import {getDuration} from 'app/utils/formatters';
import localStorage from 'app/utils/localStorage';
import {
  QuickTrace as QuickTraceType,
  QuickTraceEvent,
  TraceError,
} from 'app/utils/performance/quickTrace/types';
import {parseQuickTrace} from 'app/utils/performance/quickTrace/utils';
import Projects from 'app/utils/projects';
import {Theme} from 'app/utils/theme';

import {
  DropdownItem,
  DropdownItemSubContainer,
  ErrorNodeContent,
  EventNode,
  ExternalDropdownLink,
  QuickTraceContainer,
  SectionSubtext,
  SingleEventHoverText,
  StyledTruncate,
  TraceConnector,
} from './styles';

const TOOLTIP_PREFIX = {
  root: 'root',
  ancestors: 'ancestor',
  parent: 'parent',
  current: '',
  children: 'child',
  descendants: 'descendant',
};

type QuickTraceProps = Pick<
  EventNodeSelectorProps,
  'anchor' | 'errorDest' | 'transactionDest'
> & {
  quickTrace: QuickTraceType;
  event: Event;
  location: Location;
  organization: OrganizationSummary;
};

export default function QuickTrace({
  event,
  quickTrace,
  location,
  organization,
  anchor,
  errorDest,
  transactionDest,
}: QuickTraceProps) {
  let parsedQuickTrace;
  try {
    parsedQuickTrace = parseQuickTrace(quickTrace, event);
  } catch (error) {
    return <React.Fragment>{'\u2014'}</React.Fragment>;
  }

  const {root, ancestors, parent, children, descendants, current} = parsedQuickTrace;

  const nodes: React.ReactNode[] = [];

  if (root) {
    nodes.push(
      <EventNodeSelector
        key="root-node"
        location={location}
        organization={organization}
        events={[root]}
        text={t('Root')}
        anchor={anchor}
        nodeKey="root"
        errorDest={errorDest}
        transactionDest={transactionDest}
      />
    );
    nodes.push(<TraceConnector key="root-connector" />);
  }

  if (ancestors?.length) {
    nodes.push(
      <EventNodeSelector
        key="ancestors-node"
        location={location}
        organization={organization}
        events={ancestors}
        text={tn('%s Ancestor', '%s Ancestors', ancestors.length)}
        extrasTarget={generateMultiTransactionsTarget(
          event,
          ancestors,
          organization,
          'Ancestor'
        )}
        anchor={anchor}
        nodeKey="ancestors"
        errorDest={errorDest}
        transactionDest={transactionDest}
      />
    );
    nodes.push(<TraceConnector key="ancestors-connector" />);
  }

  if (parent) {
    nodes.push(
      <EventNodeSelector
        key="parent-node"
        location={location}
        organization={organization}
        events={[parent]}
        text={t('Parent')}
        anchor={anchor}
        nodeKey="parent"
        errorDest={errorDest}
        transactionDest={transactionDest}
      />
    );
    nodes.push(<TraceConnector key="parent-connector" />);
  }

  nodes.push(
    <EventNodeSelector
      key="current-node"
      location={location}
      organization={organization}
      text={t('This %s', toTitleCase(event.type))}
      events={[current]}
      currentEvent={event}
      anchor={anchor}
      nodeKey="current"
      errorDest={errorDest}
      transactionDest={transactionDest}
    />
  );

  if (current?.missing_service?.child) {
    nodes.push(<MissingServiceNode anchor={anchor} organization={organization} />);
  }

  if (children.length) {
    nodes.push(<TraceConnector key="children-connector" />);
    nodes.push(
      <EventNodeSelector
        key="children-node"
        location={location}
        organization={organization}
        events={children}
        text={tn('%s Child', '%s Children', children.length)}
        extrasTarget={generateMultiTransactionsTarget(
          event,
          children,
          organization,
          'Children'
        )}
        anchor={anchor}
        nodeKey="children"
        errorDest={errorDest}
        transactionDest={transactionDest}
      />
    );
  }

  if (descendants?.length) {
    nodes.push(<TraceConnector key="descendants-connector" />);
    nodes.push(
      <EventNodeSelector
        key="descendants-node"
        location={location}
        organization={organization}
        events={descendants}
        text={tn('%s Descendant', '%s Descendants', descendants.length)}
        extrasTarget={generateMultiTransactionsTarget(
          event,
          descendants,
          organization,
          'Descendant'
        )}
        anchor={anchor}
        nodeKey="descendants"
        errorDest={errorDest}
        transactionDest={transactionDest}
      />
    );
  }

  return <QuickTraceContainer>{nodes}</QuickTraceContainer>;
}

function handleNode(key: string, organization: OrganizationSummary) {
  trackAnalyticsEvent({
    eventKey: 'quick_trace.node.clicked',
    eventName: 'Quick Trace: Node clicked',
    organization_id: parseInt(organization.id, 10),
    node_key: key,
  });
}

function handleDropdownItem(
  target: LocationDescriptor,
  key: string,
  organization: OrganizationSummary,
  extra: boolean
) {
  trackAnalyticsEvent({
    eventKey: 'quick_trace.dropdown.clicked' + (extra ? '_extra' : ''),
    eventName: 'Quick Trace: Dropdown clicked',
    organization_id: parseInt(organization.id, 10),
    node_key: key,
  });
  browserHistory.push(target);
}

type EventNodeSelectorProps = {
  location: Location;
  organization: OrganizationSummary;
  events: QuickTraceEvent[];
  text: React.ReactNode;
  currentEvent?: Event;
  extrasTarget?: LocationDescriptor;
  numEvents?: number;
  anchor: 'left' | 'right';
  nodeKey: keyof typeof TOOLTIP_PREFIX;
  errorDest: ErrorDestination;
  transactionDest: TransactionDestination;
};

function EventNodeSelector({
  location,
  organization,
  events = [],
  text,
  currentEvent,
  extrasTarget,
  nodeKey,
  anchor,
  errorDest,
  transactionDest,
  numEvents = 5,
}: EventNodeSelectorProps) {
  const errors: TraceError[] = [];
  events.forEach(e => {
    e?.errors?.forEach(error => {
      if (!currentEvent || currentEvent.id !== error.event_id) {
        errors.push({
          ...error,
          transaction: e.transaction,
        });
      }
    });
  });
  // Filter out the current event so its not in the dropdown
  events = currentEvent ? events.filter(e => e.event_id !== currentEvent.id) : events;

  let type: keyof Theme['tag'] = nodeKey === 'current' ? 'black' : 'white';
  if (errors.length > 0 || (currentEvent && currentEvent?.type !== 'transaction')) {
    type = nodeKey === 'current' ? 'error' : 'warning';
    text = (
      <ErrorNodeContent>
        <IconFire size="xs" />
        {text}
      </ErrorNodeContent>
    );
  }

  if (events.length + errors.length === 0) {
    return <EventNode type={type}>{text}</EventNode>;
  } else if (events.length + errors.length === 1) {
    /**
     * When there is only 1 event, clicking the node should take the user directly to
     * the event without additional steps.
     */
    const hoverText = errors.length ? (
      t('View the error for this Transaction')
    ) : (
      <SingleEventHoverText event={events[0]} />
    );
    const target = errors.length
      ? generateSingleErrorTarget(errors[0], organization, location, errorDest)
      : generateSingleTransactionTarget(
          events[0],
          organization,
          location,
          transactionDest
        );
    return (
      <StyledEventNode
        text={text}
        hoverText={hoverText}
        to={target}
        onClick={() => handleNode(nodeKey, organization)}
        type={type}
      />
    );
  } else {
    /**
     * When there is more than 1 event, clicking the node should expand a dropdown to
     * allow the user to select which event to go to.
     */
    const hoverText = tct('View [eventPrefix] [eventType]', {
      eventPrefix: TOOLTIP_PREFIX[nodeKey],
      eventType:
        errors.length && events.length
          ? 'events'
          : events.length
          ? 'transactions'
          : 'errors',
    });
    return (
      <DropdownLink
        caret={false}
        title={<StyledEventNode text={text} hoverText={hoverText} type={type} />}
        anchorRight={anchor === 'right'}
      >
        {errors.slice(0, numEvents).map((error, i) => {
          const target = generateSingleErrorTarget(
            error,
            organization,
            location,
            errorDest
          );
          return (
            <DropdownNodeItem
              key={error.event_id}
              event={error}
              onSelect={() => handleDropdownItem(target, nodeKey, organization, false)}
              first={i === 0}
              organization={organization}
              subtext="error"
              subtextType="error"
              anchor={anchor}
            />
          );
        })}
        {events.slice(0, numEvents).map((event, i) => {
          const target = generateSingleTransactionTarget(
            event,
            organization,
            location,
            transactionDest
          );
          return (
            <DropdownNodeItem
              key={event.event_id}
              event={event}
              onSelect={() => handleDropdownItem(target, nodeKey, organization, false)}
              first={i === 0 && errors.length === 0}
              organization={organization}
              subtext={getDuration(
                event['transaction.duration'] / 1000,
                event['transaction.duration'] < 1000 ? 0 : 2,
                true
              )}
              subtextType="default"
              anchor={anchor}
            />
          );
        })}
        {events.length > numEvents && hoverText && extrasTarget && (
          <DropdownItem
            onSelect={() => handleDropdownItem(extrasTarget, nodeKey, organization, true)}
          >
            {hoverText}
          </DropdownItem>
        )}
      </DropdownLink>
    );
  }
}

type DropdownNodeProps = {
  event: TraceError | QuickTraceEvent;
  onSelect?: (eventKey: any) => void;
  first: boolean;
  organization: OrganizationSummary;
  subtext: string;
  subtextType: 'error' | 'default';
  anchor: 'left' | 'right';
};

function DropdownNodeItem({
  event,
  onSelect,
  first,
  organization,
  subtext,
  subtextType,
  anchor,
}: DropdownNodeProps) {
  return (
    <DropdownItem onSelect={onSelect} first={first}>
      <DropdownItemSubContainer>
        <Projects orgId={organization.slug} slugs={[event.project_slug]}>
          {({projects}) => {
            const project = projects.find(p => p.slug === event.project_slug);
            return (
              <ProjectBadge
                hideName
                project={project ? project : {slug: event.project_slug}}
                avatarSize={16}
              />
            );
          }}
        </Projects>
        <StyledTruncate
          value={event.transaction}
          // expand in the opposite direction of the anchor
          expandDirection={anchor === 'left' ? 'right' : 'left'}
          maxLength={35}
          leftTrim
          trimRegex={/\.|\//g}
        />
      </DropdownItemSubContainer>
      <SectionSubtext type={subtextType}>{subtext}</SectionSubtext>
    </DropdownItem>
  );
}

type EventNodeProps = {
  text: React.ReactNode;
  hoverText: React.ReactNode;
  to?: LocationDescriptor;
  onClick?: (eventKey: any) => void;
  type?: keyof Theme['tag'];
};

function StyledEventNode({text, hoverText, to, onClick, type = 'white'}: EventNodeProps) {
  return (
    <Tooltip position="top" containerDisplayMode="inline-flex" title={hoverText}>
      <EventNode type={type} icon={null} to={to} onClick={onClick}>
        {text}
      </EventNode>
    </Tooltip>
  );
}

type MissingServiceProps = Pick<QuickTraceProps, 'anchor' | 'organization'>;
type MissingServiceState = {
  hideMissing: boolean;
};

const HIDE_MISSING_SERVICE_KEY = 'quick-trace:hide-missing-services';

function readMissingServiceState() {
  const value = localStorage.getItem(HIDE_MISSING_SERVICE_KEY);
  return value === '1';
}

class MissingServiceNode extends React.Component<
  MissingServiceProps,
  MissingServiceState
> {
  state: MissingServiceState = {
    hideMissing: readMissingServiceState(),
  };

  dismissMissingService = () => {
    const {organization} = this.props;
    localStorage.setItem(HIDE_MISSING_SERVICE_KEY, '1');
    this.setState({hideMissing: true});
    trackAnalyticsEvent({
      eventKey: 'quick_trace.hide.missing-service',
      eventName: 'Quick Trace: Missing Service Clicked',
      organization_id: parseInt(organization.id, 10),
    });
  };

  render() {
    const {hideMissing} = this.state;
    const {anchor} = this.props;
    if (hideMissing) {
      return <React.Fragment />;
    }
    return (
      <React.Fragment>
        <TraceConnector />
        <DropdownLink
          caret={false}
          title={<EventNode type="white">???</EventNode>}
          anchorRight={anchor === 'right'}
        >
          <DropdownItem first width="small">
            <ExternalDropdownLink href="https://docs.sentry.io/platforms/javascript/performance/connect-services/">
              Connect to a service
            </ExternalDropdownLink>
          </DropdownItem>
          <DropdownItem onSelect={this.dismissMissingService} width="small">
            Dismiss
          </DropdownItem>
        </DropdownLink>
      </React.Fragment>
    );
  }
}
