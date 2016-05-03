import React from 'react';


function isOverflowing(el) {
  return el.clientHeight < el.scrollHeight;
}

const SummaryLine = React.createClass({
  propTypes: {
    crumb: React.PropTypes.object.isRequired
  },

  componentDidMount() {
    this.domElement = null;
    window.addEventListener('resize', this.respondToLayoutChanges);
  },

  componentWillUnmount() {
    this.domElement = null;
    window.addEventListener('resize', this.respondToLayoutChanges);
  },

  getInitialState() {
    return {
      expanded: false,
      hasOverflow: false
    };
  },

  makeSummariesGreatAgain(ref) {
    this.domElement = ref;
    this.respondToLayoutChanges();
  },

  respondToLayoutChanges() {
    if (!this.domElement) {
      return;
    }
    let hasOverflow = isOverflowing(this.domElement);
    if (hasOverflow !== this.state.hasOverflow) {
      this.setState({
        hasOverflow: hasOverflow
      });
    }
  },

  onToggle() {
    this.setState({
      expanded: !this.state.expanded
    });
  },

  render() {
    let className = 'summary';
    if (this.state.hasOverflow) {
      className += ' can-expand';
    }
    if (this.state.expanded) {
      className += ' expanded';
    }
    return (
      <div
        className={className}
        onClick={this.onToggle}
        ref={this.makeSummariesGreatAgain}>
        {this.props.children}
      </div>
    );
  }
});

export default SummaryLine;
