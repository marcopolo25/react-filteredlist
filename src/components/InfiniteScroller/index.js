import React, {Component} from 'react';
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types';
import InfiniteScroll from 'react-bidirectional-infinite-scroll';
import {bindActionCreators} from "redux";
import * as PaginationActions from "src/components/Pagination/actions";
import {connect} from "react-redux";
import _ from "underscore";



// Todo: Keep current position in the scrollable list.
// The view should append or prepend data to the scrollable list but keep the current position in the list

// Todo: Add loading icon on scroll up or down


const Loading = ({ loadingTop, loadingBottom}) => {
	const classNames = ['dl__infiniteScroll-loading', `${loadingTop && 'top'}`, `${loadingBottom && 'bottom'}`].join(' ');
	return <div className={classNames}>
						<h3>Loading</h3>
						<div></div>
					</div>
};

class InfiniteScroller extends Component {
	
	constructor(props) {
		super(props)
		
		this.state = {
			listItems: null,
			clientHeight: null,
			currentTopPage: 0,
			currentBottomPage: 0,
			totalPages: 0,
			pagination: props.pagination,
			loadingTop: false,
			loadingBottom: false
		};
		
		this.handleOnReachUp = this.handleOnReachUp.bind(this);
		this.handleOnReachBottom = this.handleOnReachBottom.bind(this);
		this._runPagingComputation = this._runPagingComputation.bind(this);

		const self = this;
		document.addEventListener('renderToStore', self._runPagingComputation);
	}
	
	componentDidMount() {
		console.log(this.props.children.ref)
		// this._runPagingComputation();
		// this._maintainPaginationScrollPosition();
	}
	
	// componentWillReceiveProps(nextProps) {
	// 	const isEqual = _.isEqual(_.sortBy(this.props.app.Items), _.sortBy(nextProps.app.Items));
	// 	console.log(nextProps.children.ref)
	// 	const { children } = nextProps, {ref} = children;
	// 	if(ref) {
	// 		console.log(ref.current);
	// 	}
	// 	// if(this.props.app.Items !== nextProps.app.Items) {
	// 	// 	const { app } = nextProps;
	// 	// 	console.log('app: ', app)
	// 	//
	// 	// }
	// }
	
	static getDerivedStateFromProps(props, state) {
		const {app} = props;
		if(app.listItems !== state.listItems){
			return {
				listItems: app.Items
			}
		}
		return null;
	}
	
	componentDidUpdate(props, state) {
		const isEqual = _.isEqual(_.sortBy(this.state.listItems), _.sortBy(state.listItems));
		if(!isEqual) {
			// this._maintainPaginationScrollPosition();
			this.setState({ loadingTop: false, loadingBottom: false })
		}
	}
	
	
	
	_runPagingComputation(){
		const self = this;
		const { pagination } = self.props, { action } = pagination,
			totalPages = Math.ceil(pagination.total / pagination.take);
		let currentPage = 1,
			params = {
			pagination,
			totalPages
		};
		
		// Make current page
		if (isFinite(pagination.skip / pagination.take)) {
			switch (Math.floor((pagination.skip / pagination.take))) {
				case 0://Skip was zero = page 1
					currentPage = 1;
					break;
				case 1://skip is same as take = page 2
					currentPage = 2;
					break;
				default:
					currentPage = Math.floor((pagination.skip / pagination.take)) + 1;
					break;
			}
		}

		
		// Add the top and bottom page prop if pagination event
		// was NOT fired from the infinite scroll event
		if(!action) {
			params = {
				...params,
				currentTopPage: currentPage,
				currentBottomPage: currentPage
			}
		}
		
		self.setState(params);
	};
	
	_maintainPaginationScrollPosition() {
	}
	
	makePaginationEvent(action) {
		let page = 1;
		switch (action) {
			case 'prev':
				page = this.state.currentTopPage === 1
					? 1
					: this.state.currentTopPage - 1;
				break;
			case 'next':
				page = this.state.currentBottomPage === this.state.totalPages
					? this.state.totalPages
					: this.state.currentBottomPage + 1;
				break;
		}
		
		const calculatedSkip = page === 1
			? 0
			: page * (this.state.pagination.take) - this.state.pagination.take;
		
		return {
			skip: calculatedSkip,
			take: this.state.pagination.take,
			page,
			action
		};
	}
	
	handleOnReachUp() {
		// Exit scroll event if on the last page
		if(this.state.currentTopPage > 1) {
			if(!this.state.loadingTop) {
				const event = this.makePaginationEvent('prev');
				this.sendEvent(event);
				this.setState({loadingTop: true, currentTopPage: event.page});
			}
		}
	}
	
	handleOnReachBottom() {
		// Exit scroll event if on the last page
		if(this.state.currentBottomPage < this.state.totalPages) {
			if(!this.state.loadingBottom) {
				const event = this.makePaginationEvent('next');
				this.sendEvent(event);
				this.setState({loadingBottom: true, currentBottomPage: event.page});
			}
		}
	}
	
	sendEvent(e) {
		const { config, updatePagination } = this.props,
			eventData = Object.assign({}, e, { id: `dl__items__${config.id}` });
		
		// Dispatch the redux event before the DOM evt
		updatePagination({ pagination: eventData });
	}
	
	render() {
		const { children } = this.props;
		const { loadingTop, loadingBottom } = this.state;
		
		return (
			<div className="dl__infiniteScroll">
				<InfiniteScroll
					onReachBottom={this.handleOnReachBottom}
					onReachTop={this.handleOnReachUp}
				>
					{ loadingTop && <Loading/> }
					{ children }
					{ loadingBottom && <Loading/> }
				</InfiniteScroll>
			</div>
		);
	}
}

InfiniteScroller.propTypes = {};

function mapStateToProps(state, ownProps) {
	return {
		config: state.app.config,
		pagination: state.app.pagination,
		force: state.app.force,
		app: state.app,
		selectedView: state.app.selectedView
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(PaginationActions, dispatch);
}

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(InfiniteScroller);
