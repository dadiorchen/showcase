/* The navigator tooltip component */
//@flow
import React from "react"
import ReactDOM		from 'react-dom'
import jQuery			from 'jquery'
import {connect}	from 'react-redux'
import {compose}		from 'redux'
import StateMachine		from 'javascript-state-machine'

import {Navigator as NavigatorModel,Position}	from '../model/Navigator.js'
import {Factory}		from '../factory.js'
import {summerConnect}		from '../summer/summerConnect.js'
import {NoteModel}		from '../model/NoteModel.js'
import {type StateType}	from '../model/store.js'
import {utils}			from '../utils/Utils.js'
import {Note}			from '../model/Note.js'
import {Hashtag}		from '../model/Hashtag.js'
import {FactoryComponent}		from '../factoryComponent.js'
import {HashtagModel}		from '../model/HashtagModel.js'
import {MindmapModel}		from '../model/MindmapModel.js'
import {type NavigatorType}		from '../model/states/StateNavigator.js'
import {type TypeMenuStatus}		from '../types.js'
import {ERROR}		from '../error.js'
import {HashtagTooltip}		from '../model/HashtagTooltip.js'

const log	= require('loglevel').getLogger('../component/Navigator.js')


type Props = {
	goto		: (hashtagId : string, anchor? : string) => Promise<boolean>,
	navigator		: NavigatorType,
	documentRoot	: Hashtag | Note,
	menuStatus		: TypeMenuStatus,

	factoryComponent	: FactoryComponent,
	getHashtagModel		: () => HashtagModel,
	getNavigatorModel	: () => NavigatorModel,
	getNoteModel		: () => NoteModel,
	getMindmapModel		: () => MindmapModel,
	getHashtagTooltip		: () => HashtagTooltip,
}
type State = {
	isMenuVisible : boolean,
	menuX : number,
	menuY : number,
	menuItems : Array<Position>,
	breadcrumbs		: Array<string>,
	/*
	 * This is for a status: when user click button of back/forward, then, 
	 * set this variable to true, so, UI should disable some operation, like:
	 * click the back/forward again
	 */
	isProcessing		: boolean,
}
export class Navigator extends React.Component<Props,State>{
	static defaultProps		= {
	}

	backRef		: any;
	forwardRef	: any;
	/* the timer to control the menu show/hide.*/
	timerRef	: any
	timerBRef	: any
	timerBackEnter		: any
	timerBackLeave		: any
	timerForwardEnter		: any
	timerForwardLeave		: any
	timerMenuLeave		: any
	//the ms of delay time to show the menu 
	durationDelay	: number	= 1000
	durationDelayLeave	: number	= 500
	//the state machine for menu display
	menuState		: StateMachine	
	constructor( props : Props){
		//{{{
		super(props);
		//check
		utils.isType(props.goto, 'Function')
		utils.isType(props.menuStatus, 'string')
		utils.isType(props.navigator, 'defined')
		utils.isType(props.getHashtagModel, 'Function')
		utils.isType(props.getNoteModel, 'Function')
		utils.isType(props.getMindmapModel, 'Function')
		utils.isType(props.getHashtagTooltip, 'Function')

		this.state = {
			isMenuVisible : false,
			menuX : 0,
			menuY : 0,
			menuItems : [],
			breadcrumbs		: [],
			isProcessing		: false,
		}
		this.menuState		= this.buildMenuState()
		//bind
		////$FlowFixMe
		this.breadcrumbsGoto		= this.breadcrumbsGoto.bind(this)
		//$FlowFixMe
		this.buildMenuState		= this.buildMenuState.bind(this)
		//$FlowFixMe
		this.clearAllTimer		= this.clearAllTimer.bind(this)
		//$FlowFixMe
		this.getMenuState		= this.getMenuState.bind(this)
		//$FlowFixMe
		this.handleClickBack		= this.handleClickBack.bind(this)
		//$FlowFixMe
		this.handleClickForward		= this.handleClickForward.bind(this)
		//$FlowFixMe
		this.handleMenuClick		= this.handleMenuClick.bind(this)
		//$FlowFixMe
		this.handleMenuMouseEnter		= this.handleMenuMouseEnter.bind(this)
		//$FlowFixMe
		this.handleMenuMouseLeave		= this.handleMenuMouseLeave.bind(this)
		//$FlowFixMe
		this.handleMouseEnterBack		= this.handleMouseEnterBack.bind(this)
		//$FlowFixMe
		this.handleMouseEnterForward		= this.handleMouseEnterForward.bind(this)
		//$FlowFixMe
		this.handleMouseLeaveBack		= this.handleMouseLeaveBack.bind(this)
		//$FlowFixMe
		this.handleMouseLeaveForward		= this.handleMouseLeaveForward.bind(this)
		//$FlowFixMe
		this.hideMenu		= this.hideMenu.bind(this)
		//$FlowFixMe
		this.setMenuState		= this.setMenuState.bind(this)
		//$FlowFixMe
		this.showMenu		= this.showMenu.bind(this)
		//$FlowFixMe
		this.updateBreadcrumbs		= this.updateBreadcrumbs.bind(this)
		//}}}
	}
	/********************** properties ************/
	/********************** react method ***********/
	componentDidMount(){
		//{{{
		const label		= 'Navigator -> componentDidMount'
		log.debug('%s:',label)
		if(this.props.documentRoot){
			this.updateBreadcrumbs()
		}
		//}}}
	}

	componentDidUpdate(propsPrev : Props, statePrev : State){
		//{{{
		const label		= 'Navigator -> componentDidUpdate'
		log.debug('%s:',label)
		if(
			this.props.documentRoot && 
			!propsPrev.documentRoot ||
			this.props.documentRoot && 
			propsPrev.documentRoot._id !== this.props.documentRoot._id
		){
			log.trace('%s:current hashtag changed, get breadcrumbs',label)
			this.updateBreadcrumbs()
		}
		//}}}
	}
	/********************** component method *******/
	/* According current hashtag, get breadcrumbs */
	updateBreadcrumbs(){
		//{{{
		const label		= 'Navigator -> updateBreadcrumbs'
		log.debug('%s:',label)
		const {documentRoot, getHashtagModel}		= this.props
		utils.isType(documentRoot, 'defined')
		if(documentRoot instanceof Note){
			log.error('%s:unsupported:%o', label, documentRoot)
			throw utils.E(ERROR.GENERAL_LOGICAL_ERROR)
		}
		const breadcrumbs		= getHashtagModel()
			.getBreadcrumbs(documentRoot._id)
		this.setState({
			breadcrumbs,
		})
		//}}}
	}

	handleMouseLeaveBack(){
		//{{{
		const label		= 'Navigator -> handleMouseLeaveBack'
		log.debug('%s:',label)
		this.clearAllTimer()
		this.timerBackLeave		= setTimeout(() => {
			this.menuState.backMouseLeaveAWhile()
		}, this.durationDelayLeave)
		//}}}
	}

	handleMouseEnterBack(){
		//{{{
		const label		= 'Navigator -> handleMouseEnterBack'
		log.debug('%s:',label)
		/* 
		 * Mouse enter the button, clear previous timer, start new timer
		 */
		this.clearAllTimer()
		/*
		 * CASE: if enter the back, and the state is still forwardVisible, 
		 * that means: the mouse was on the forward earlier, and just move 
		 * to back, in this case, do not set timeout, show back menu directly
		 */
		if(this.menuState.state === 'forwardVisible'){
			this.menuState.moveFromForwardToBack()
		}else{
			this.timerBackEnter		= setTimeout(() => {
				this.menuState.backMouseEnterAWhile()
			},this.durationDelay)
		}
		//}}}
	}

	handleMouseEnterForward(){
		//{{{
		const label		= 'Navigator -> handleMouseEnterForward'
		log.debug('%s:',label)
		/* 
		 * Mouse enter the button, clear previous timer, start new timer
		 */
		this.clearAllTimer()
		/*
		 * Move
		 */
		if(this.menuState.state === 'backVisible'){
			this.menuState.moveFromBackToForward()
		}else{
			this.timerForwardEnter		= setTimeout(() => {
				this.menuState.forwardMouseEnterAWhile()
			},this.durationDelay)
		}
		//}}}
	}

	handleMouseLeaveForward(){
		//{{{
		const label		= 'Navigator -> handleMouseLeaveForward'
		log.debug('%s:',label)
		this.clearAllTimer()
		this.timerForwardLeave		= setTimeout(() => {
			this.menuState.forwardMouseLeaveAWhile()
		}, this.durationDelayLeave)
		//}}}
	}

	/*
	 * REVISE Wed Feb 20 20:14:52 CST 2019
	 * 	Change this fn to sync, because when user clicked the button, should
	 * 	wait for it to be done.
	 */
	handleClickBack(){
		//{{{
		const label		= 'Navigator -> handleClickBack'
		log.debug('%s:',label)
		//to close menu 
		this.menuState.changeNavigator()
		const {getNavigatorModel, goto}		= this.props
		this.setState({
			isProcessing		: true,
		}, async () => {
			const position		= await utils.a(/*istanbul ignore next*/() => utils.E(), getNavigatorModel().goBack() )
			if(position){
				utils.isType(
					await utils.a(/* istanbul ignore next*/() => utils.E(), goto(position.getKey(),position.getKeyAnchor())),
					true
				)
			}
			//finished
			this.setState({
				isProcessing		: false,
			})
		})
		//}}}
	}

	async handleClickForward(){
		//{{{
		const label		= 'Navigator -> handleClickForward'
		log.debug('%s:',label)
		//to close menu 
		this.menuState.changeNavigator()
		const {getNavigatorModel, goto}		= this.props
		this.setState({
			isProcessing		: true,
		}, async () => {
			const position		= await utils.a(/*istanbul ignore next*/() => utils.E(), getNavigatorModel().goForward())
			if(position){
				utils.isType(
					await utils.a(/* istanbul ignore next*/() => utils.E(), goto(position.getKey(),position.getKeyAnchor())),
					true
				)
			}
			//finished
			this.setState({
				isProcessing		: false,
			})
		})
		//}}}
	}

	handleMenuMouseLeave(){
		//{{{
		const label		= 'Navigator -> handleMenuMouseLeave'
		log.debug('%s:',label)
		//If leave , and no menu choose, then , need to hide menu
		//automatically 
		this.clearAllTimer()
		this.timerMenuLeave		= setTimeout(() => {
			this.menuState.menuLeaveAWhile()
		},this.durationDelayLeave)
		//}}}
	}

	handleMenuMouseEnter(){
		//{{{
		const label		= 'Navigator -> handleMenuMouseEnter'
		log.debug('%s:',label)
		/*
		 * Clear other timer, cuz some leave timer will hide the menu, to clear
		 * it to avoid the menu closing
		 */
		this.clearAllTimer()
		//}}}
	}

	clearAllTimer(){
		clearTimeout(this.timerBackEnter)
		clearTimeout(this.timerBackLeave)
		clearTimeout(this.timerForwardEnter)
		clearTimeout(this.timerForwardLeave)
	}

	/*
	 * Click the menu
	 */
	async handleMenuClick(position : Position){
		//{{{
		const label		= 'Navigator -> handleMenuClick'
		log.debug('%s:',label)
		//to close menu 
		this.menuState.changeNavigator()
		const {getNavigatorModel, } = this.props
		const positionInNavigator		= await utils.a(/*istanbul ignore next*/() => utils.E(), getNavigatorModel().jump(position))
		/*istanbul ignore else: impossible*/
		if(positionInNavigator){
			log.debug('%s:jump to position:%s',label,position)
			this.props.goto(position.getKey(),position.getKeyAnchor())
		}else{
			log.error('%s:can not foundthe position to jump:%o',
				label,
				position
			)
			throw utils.E(ERROR.GENERAL_LOGICAL_ERROR)
		}
		//}}}
	}

	/*
	 * goto + visit 
	 * REVISE Thu Feb 21 05:49:35 CST 2019
	 * 	Convert fn from async to sync
	 */
	breadcrumbsGoto(hashtagId : string){
		//{{{
		const label		= 'Navigator -> breadcrumbsGoto'
		log.debug('%s:',label)
		const {getNavigatorModel, getHashtagTooltip, goto}		= this.props
		/*
		 * cancel tooltip
		 */
		getHashtagTooltip().handleMouseLeave()
		this.setState({
			isProcessing		: true,
		}, async () => {
			utils.isType(
				await utils.a(/*istanbul ignore next*/() => utils.E(), getNavigatorModel().visitHashtag(hashtagId)),
				true
			)
			utils.isType(
				await utils.a(/* istanbul ignore next*/() => utils.E(), goto(hashtagId)),
				true
			)
			//finished
			this.setState({
				isProcessing		: false,
			})
		})
		//}}}
	}

	/*
	 * show menu list
	 * limit the count to < 20
	 */
	showMenu(type : 'back'|'forward'){
		//{{{
		const label		= 'Navigator -> showMenu'
		log.debug('%s:',label)
		const {getNavigatorModel}		= this.props
		utils.isTypeEnum(type, NavigatorModel.DIRECTION)
		let menuX = 0;
		let menuY = 0;
		let menuItems : Array<Position>;
		//TODO remove jQuery requirement
		const {left,top} = jQuery(type === 'back' ?this.backRef : this.forwardRef).offset()
		menuX = left;
		menuY = top + 22;
		if(type === 'back'){
			menuItems		= getNavigatorModel().getPositionsBack().reverse()
		}else{
			menuItems		= getNavigatorModel().getPositionsForward()
		}
		menuItems		= menuItems.slice(0,15)
		log.debug(
			'%s:to show menu at [%d,%d] with items %d',
			label,
			menuX,
			menuY,
			menuItems.length
		)
		this.setState({
			isMenuVisible		: true,
			menuX,
			menuY,
			menuItems,
		})
		//}}}
	}

	/*istanbul ignore next: tired*/
	hideMenu(){
		//{{{
		const label		= 'Navigator -> hideMenu'
		log.debug('%s:',label)
		this.setState({
			isMenuVisible		: false,
		})
		//}}}
	}

	/*
	 * To build the state machine
	 */
	buildMenuState(){
		return new StateMachine({
			//{{{
			init		: 'invisible',
			transitions		: [
				{
					//mouse enter back button hold for a while
					name		: 'backMouseEnterAWhile',
					from		: 'invisible',
					to		: 'backVisible',
				},
				{
					name		: 'forwardMouseEnterAWhile',
					from		: 'invisible',
					to		: 'forwardVisible',
				},
				{
					name		: 'backMouseLeaveAWhile',
					from		: 'backVisible',
					to		: 'invisible',
				},
				{
					name		: 'forwardMouseLeaveAWhile',
					from		: 'forwardVisible',
					to		: 'invisible',
				},
				{
					//if mouse move out menu for a while, hide menu anyway
					name		: 'menuLeaveAWhile',
					from		: '*',
					to		: 'invisible',
				},
				{
					name		: 'moveFromForwardToBack',
					from		: 'forwardVisible',
					to		: 'backVisible',
				},
				{
					name		: 'moveFromBackToForward',
					from		: 'backVisible',
					to		: 'forwardVisible',
				},
				{
					//fire on: click menu item or click back/forward arrow
					name		: 'changeNavigator',
					from		: '*',
					to		: 'invisible',
				},
				{ name: 'goto', from: '*', to: function(s) { return s } }
			],
			methods		: {
				onInvalidTransition: /*istanbul ignore next: impossible*/function(transition, from, to) {
					log.error(
						"transition not allowed from that state",
						transition,
						from,
						to
					)
				},
				onBackVisible		: () => {
					//{{{
					const label		= 'menuState -> onBackVisible'
					log.debug('%s:',label)
					this.showMenu('back')
					//}}}
				},
				onForwardVisible		: () => {
					//{{{
					const label		= 'menuState -> onForwardVisible'
					log.debug('%s:',label)
					this.showMenu('forward')
					//}}}
				},
				onInvisible		: () =>{
					//{{{
					const label		= 'menuState -> onInvisible'
					log.debug('%s:',label)
					this.hideMenu()
					//}}}
				},
			}
			//}}}
		})

	}

	getMenuState(){
		return this.menuState.state
	}

	setMenuState(state : string){
		this.menuState.goto(state)	
	}

	render(){
		const label		= 'Navigator -> render'
		log.trace('%s:',label)
		const {
			getNavigatorModel,
			documentRoot, 
			factoryComponent,
			menuStatus,
		} = this.props;
		//$FlowFixMe
		let documentHashtag	: Hashtag = documentRoot instanceof Hashtag ? documentRoot : undefined
		const {isMenuVisible,menuX,menuY,menuItems, isProcessing} = this.state;
		const isBackAvailable = getNavigatorModel()
			.getPositionsBack().length > 0 ? true : false;
		const isForwardAvailable = getNavigatorModel()
			.getPositionsForward().length > 0 ? true : false;
		/*
		 * The menu, should mount to body
		 */
		let menu
		if(isMenuVisible && menuItems && menuItems.length > 0 ){
			//$FlowFixMe
			menu	= ReactDOM.createPortal(
				<div 
					style={{left:menuX,top:menuY}}
					className='pop-menu bf-menu __open' 
					onMouseLeave={this.handleMenuMouseLeave}
					onMouseEnter={this.handleMenuMouseEnter}
				>

					<div className='pop-menu-lis' >
						{menuItems.map(position =>
							<li 
								style={{
									userSelect	: 'none',
								}}
								onClick={/*istanbul ignore next: difficult*/() => this.handleMenuClick(position)}
								key={position.format()}>
								{position.isNotePosition() ?
									<factoryComponent.Note
										noteId={position.getKey()}
										mode='navigator'
									/>
								:
									<factoryComponent.Hashtag
										mode='navigator'
										hashtagId={position.getKey()}
									/>
								}
								{position.getKeyAnchor() &&
									<span>#</span>
								}
							</li>
						)}
					</div>
				</div>,
				document.body
			)
		}else{
			menu	= null
		}
		return (
			<div className='main-head-location' >
				<div className='head-location-fb'>
						<div 
							ref={/*istanbul ignore next*/r => this.backRef = r}
							onMouseEnter={isBackAvailable && !isProcessing? this.handleMouseEnterBack : undefined}
							onMouseLeave={isBackAvailable && !isProcessing? this.handleMouseLeaveBack : undefined}
							onClick={isBackAvailable && !isProcessing? this.handleClickBack : undefined}
							className={`location-fb-backward ${isBackAvailable && !isProcessing?'button-svg-icon-valid':'button-svg-icon-invalid'} `}>
							<div className="location-fb-backward-icon"></div>
						</div>
						<div 
							ref={/*istanbul ignore next*/r => this.forwardRef = r}
							onMouseEnter={isForwardAvailable && !isProcessing? this.handleMouseEnterForward : undefined}
							onMouseLeave={isForwardAvailable && !isProcessing? this.handleMouseLeaveForward : undefined}
							onClick={isForwardAvailable && !isProcessing? this.handleClickForward : undefined}
							className={`location-fb-forward ${isForwardAvailable && !isProcessing?'button-svg-icon-valid':'button-svg-icon-invalid'} `}>
							<div className="location-fb-forward-icon"></div>
						</div>
				</div>
				<div className='head-location-nav'>
					{this.state.breadcrumbs.map((hashtagId,i) => {
						if(i === this.state.breadcrumbs.length - 1){
							return (
								<div 
									key={`${hashtagId}-${i}`}
									onClick={/*istanbul ignore next*/() => this.breadcrumbsGoto(hashtagId)}
									className={`head-location-nav-current ${menuStatus === 'mindmap'?'__open':''}`} 
								>
									<factoryComponent.Hashtag
										hashtagId={hashtagId}
										mode='navigator'
									/>
								</div>
							)
						}else{
							return (
								<div 
									key={`${hashtagId}-${i}`}
									onClick={/*istanbul ignore next*/() => this.breadcrumbsGoto(hashtagId)}
									className='head-location-nav-i'
								>
									<factoryComponent.Hashtag
										hashtagId={hashtagId}
										mode='breadcrumbs'
									/>
								</div>
							)
						}
					})}
				</div>
			{menu}
			</div>
		)
	}
}

export const NavigatorConnected	= compose(
	connect(
		(state : StateType) => {
			let documentRoot
			if(state.hashtagIdCurrent.startsWith('n-')){
				documentRoot	= state.noteByIds[state.hashtagIdCurrent]
			}else{
				documentRoot	= state.hashtagByIds[state.hashtagIdCurrent]
			}
			return {
				documentRoot,
				navigator	: state.navigator,
				menuStatus		: state.menuStatus,
			}
		},
	),
	summerConnect(
		(factory : Factory) => {
			return {
				getNoteModel	: factory.getNoteModel,
				getNavigatorModel	: factory.getNavigatorModel,
				getHashtagModel		: factory.getHashtagModel,
				getMindmapModel		: factory.getMindmapModel,
				getHashtagTooltip		: factory.getHashtagTooltip,
			}
		}
	)
)(Navigator)


