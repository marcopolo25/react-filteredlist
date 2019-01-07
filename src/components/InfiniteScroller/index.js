import React, {Component} from 'react';
import PropTypes from 'prop-types';
import InfiniteScroll from 'react-bidirectional-infinite-scroll';
import {bindActionCreators} from "redux";
import * as PaginationActions from "src/components/Pagination/actions";
import {connect} from "react-redux";
import _ from "underscore";



// Todo: Keep current position in the scrollable list.
// The view should append or prepend data to the scrollable list but keep the current position in the list

// Todo: Add loading icon on scroll up or down


// Normal Pagination object
// {skip: 125, take: 25, page: 6, id: "dl__items__assets"}

class InfiniteScroller extends Component {
	
	constructor(props) {
		super(props)
		
		this.state = {
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
	
	// componentWillReceiveProps(nextProps) {
	// 	console.log(this.props)
	// 	if(this.props !== nextProps) {
	// 		console.log('run pagination computation.');
	// 		this._runPagingComputation();
	// 	}
	// }
	
	_runPagingComputation(){
		const self = this;
		const { pagination } = self.props,
			totalPages = Math.ceil(pagination.total / pagination.take);
		let currentPage = 1;
		
		console.log('pagination: ', pagination);

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

		let params = {
			pagination,
			totalPages,
			currentTopPage: currentPage,
			currentBottomPage: currentPage,
			loadingTop: false,
			loadingBottom: false
		};
		
		self.setState(params);
	};
	
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
			const event = this.makePaginationEvent('prev');
			this.sendEvent(event);
			this.setState({ loadingTop: true, currentTopPage: event.page });
		}
	}
	
	handleOnReachBottom() {
		// Exit scroll event if on the last page
		if(this.state.currentBottomPage < this.state.totalPages) {
			const event = this.makePaginationEvent('next');
			this.sendEvent(event);
			this.setState({ loadingBottom: true, currentBottomPage: event.page });
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
			<div className="dl__infiniteScroller">
				<InfiniteScroll
					onReachBottom={this.handleOnReachBottom}
					onReachTop={this.handleOnReachUp}
				>
					{/*{ loadingTop && <div className="dl__infiniteScroller-loading">Loading</div> }*/}
					{ children }
					{/*{ loadingBottom && <div className="dl__infiniteScroller-loading">Loading</div> }*/}
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
