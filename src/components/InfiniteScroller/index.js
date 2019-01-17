import React, {Component} from 'react';
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types';
import InfiniteScroll from 'react-bidirectional-infinite-scroll';
import {bindActionCreators} from "redux";
import * as PaginationActions from "src/components/Pagination/actions";
import {connect} from "react-redux";
import _ from "underscore";
import createHistory from 'history/createBrowserHistory';
const history = createHistory();



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
			scrollContainerHeight: null,
			clientHeight: null,
			currentTopPage: 0,
			currentBottomPage: 0,
			totalPages: 0,
			pagination: props.pagination,
			loadingTop: false,
			loadingBottom: false,
			scrollTo: null
		};
		
		this.handleOnReachTop = this.handleOnReachTop.bind(this);
		this.handleOnReachBottom = this.handleOnReachBottom.bind(this);
		this._runPagingComputation = this._runPagingComputation.bind(this);
		this.scrollContainer = React.createRef();

		const self = this;
		document.addEventListener('renderToStore', self._runPagingComputation);
	}
	
	static getDerivedStateFromProps(props, state) {
		const {app, children, pagination} = props;
		let { scrollContainerHeight, clientHeight} = state;
		
		if(app.listItems !== state.listItems){
			// Get clientHeight of dataList on filter or pagination events ONLY
			// The initial clientHeight should not change on infinite scrolling
			if(!scrollContainerHeight) {
				if (pagination && !pagination.action) {
					scrollContainerHeight = (children && children.ref && children.ref.current ? children.ref.current.clientHeight : null);
				}
			}
			
			clientHeight = (children && children.ref && children.ref.current ? children.ref.current.clientHeight : null);
			
			
			
			
			return {
				listItems: app.Items,
				scrollContainerHeight,
				clientHeight
			}
		}
		return null;
	}
	
	componentDidUpdate(props, state) {
		
		const { children, pagination } = props;
		
		if(state.clientHeight) {
			if(this.state.clientHeight !== state.clientHeight) {
				const scrollToPos = Number(this.state.clientHeight) - Number(state.clientHeight);
			}
		}
		
		const isEqual = _.isEqual(_.sortBy(this.state.listItems), _.sortBy(state.listItems));
		if(!isEqual) {
			this.setState({ loadingTop: false, loadingBottom: false });
		}
		
		if(pagination.action && pagination.action === 'prev'
			&& props.children) {
			// console.log('take all the heights: ', this.state.clientHeight, state.clientHeight)
			// this.scrollContainer.current.scroller.scrollTop = 800;
		}
		
	}
	
	makeScrollToPosition(props) {
		const { children } = props;
		if(children && children.ref) {
			console.log(props.children.ref.current.clientHeight)
			console.log('children: ', children.ref.current.clientHeight)
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
	
	handleOnReachTop() {
		// Exit scroll event if on the last page
		if(this.state.currentTopPage > 1) {
			if(!this.state.loadingTop) {
				const event = this.makePaginationEvent('prev');
				this.sendEvent(event)
					.writeQueryStringToURL(`?skip=${event.skip}&take=${event.take}&page=${event.page}`)
					.setState({loadingTop: true, currentTopPage: event.page});
			}
		}
	}
	
	handleOnReachBottom() {
		// Exit scroll event if on the last page
		if(this.state.currentBottomPage < this.state.totalPages) {
			if(!this.state.loadingBottom) {
				const event = this.makePaginationEvent('next');
				this.sendEvent(event)
					.writeQueryStringToURL(`?skip=${event.skip}&take=${event.take}&page=${event.page}`)
					.setState({loadingBottom: true, currentBottomPage: event.page});
			}
		}
	}
	
	sendEvent(e) {
		const { config, updatePagination } = this.props,
			eventData = Object.assign({}, e, { id: `dl__items__${config.id}` });
		
		// Dispatch the redux event before the DOM evt
		updatePagination({ pagination: eventData });
		
		return this;
	}
	
	// TODO: The 2 preceding methods needs to be moved to the queries utils for reuse. Be sure to update all references of these
	// TODO: with the exported ones.
	/**
	 * Handles writing to the url if selected by config
	 * @param queryString
	 */
	writeQueryStringToURL(queryString) {
		const { pagination } = this.props,
			self = this,
			path = window.location.href.split('?')[0].split(window.location.host)[1];//@todo check if this works on production
		
		// The delay is import for handling what looks like a conflict with Meteor's iron-router
		//@todo may be able to remove this from filterSort component not in a Meteor site
		setTimeout(function () {
			history.replace(path + queryString + '&' + self.getExistingQueryParams());
		}, 1000);
		
		return this;
	}
	
	/**
	 * Gets the pagination query params from the url to preserve them on write
	 */
	getExistingQueryParams() {
		const params = _.omit(this.parseParms(window.location.href.split('?')[1]), ['skip', 'take', 'page', ""]);
		let str = '';
		
		for (let key in params) {
			str += `${key}=${params[key]}&`
		}
		
		return str === '=&' ? '' : str.slice(0, -1);// removes the last ampersand
	}
	
	/**
	 * From: http://stackoverflow.com/questions/23481979/function-to-convert-url-hash-parameters-into-object-key-value-pairs
	 * @param str
	 * @returns {{}}
	 */
	parseParms(str = '') {
		var pieces = str.split("&"), data = {}, i, parts;
		// process each query pair
		for (i = 0; i < pieces.length; i++) {
			parts = pieces[i].split("=");
			if (parts.length < 2) {
				parts.push("");
			}
			data[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
		}
		return data;
	}
	
	render() {
		const { children } = this.props;
		const { loadingTop, loadingBottom, scrollContainerHeight } = this.state;
		
		return (
			<div className="dl__infiniteScroll" style={{ height: scrollContainerHeight}}>
				<InfiniteScroll
					onReachBottom={this.handleOnReachBottom}
					onReachTop={this.handleOnReachTop}
					position={50}
					ref={this.scrollContainer}
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
