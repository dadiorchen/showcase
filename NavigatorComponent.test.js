//@flow
import PouchDB from 'pouchdb'
import PouchdbFind from 'pouchdb-find'
import React from 'react'
import { mount, shallow } from 'enzyme'
import loglevel from 'loglevel'

import { utils } from '../utils/Utils.js'
import { ERROR } from '../error.js'
import { Navigator, NavigatorConnected } from './Navigator.js'
import * as testUtils from '../testUtils.js'
import { Hashtag } from '../model/Hashtag.js'
import { Position } from '../model/Navigator.js'
import { FactoryComponent } from '../factoryComponent.js'

jest.mock('pouchdb')
jest.mock('jquery')
jest.useFakeTimers()
const log = loglevel.getLogger('../component/Navigator.test.js')
log.setLevel('trace')
loglevel.getLogger('../component/Navigator.js').setLevel('trace')

describe('test Navigator', () => {
	//{{{
	const label = 'Navigator -> test'
	let props
	let hashtagA

	beforeEach(() => {
		hashtagA = new Hashtag('A')
		const navigatorModel = {
			getPositionsBack: testUtils.jestFn([], 'getPositionBack'),
			getPositionsForward:
				testUtils.jestFn([], 'getPositionForward'),
			jump: testUtils.jestPromiseTrue('jump'),
			visitHashtag: testUtils.jestPromiseTrue('visitHashtag'),
		}
		const mindmapModel = {
		}
		const hashtagModel = {
			getBreadcrumbs: testUtils.jestFn([hashtagA._id], 'getBreadcrumbs'),
		}
		const hashtagTooltip = {
			handleMouseLeave: testUtils.jestTrue('handleMouseLeave'),
		}
		props = {
			goto: testUtils.jestTrue('goto'),
			menuStatus: 'document',
			getNavigatorModel: () => navigatorModel,
			getMindmapModel: () => mindmapModel,
			getHashtagModel: () => hashtagModel,
			getNoteModel: () => { },
			factoryComponent: new FactoryComponent(),
			getHashtagTooltip: () => hashtagTooltip,
			navigator: {},
		}
		const jQuery = require('jquery')
		jQuery.mockImplementation(() => ({
			offset: () => ({ left: 0, top: 0 }),
		}))
	})

	describe('shallow it with documentRoot:A', () => {
		//{{{
		let navigator

		beforeEach(() => {
			navigator = shallow(
				//$FlowFixMe
				<Navigator
					documentRoot={hashtagA}
					{...props}
				/>
			)
		})

		it('render should be able to find .main-head-location', () => {
			expect(navigator.find('.main-head-location')).toHaveLength(1)
		})

		it('under div .head-location-nav should have <Hashtag/> as breadcrumbs', () => {
			expect(navigator.find('.head-location-nav').find(props.factoryComponent.Hashtag)).toHaveLength(1)
		})

		describe('call updateBreadcrumbs', () => {
			//{{{
			beforeEach(() => {
				navigator.instance().updateBreadcrumbs()
			})

			it('hashtagModel.getBreadcrumbs should be called with A._id', () => {
				expect(props.getHashtagModel().getBreadcrumbs).toHaveBeenCalledWith(hashtagA._id)
			})
			//}}}
		})

		describe('call showMenu with back', () => {
			//{{{
			beforeEach(() => {
				navigator.instance().showMenu('back')
			})

			it('nothing should be checked', () => {
			})
			//}}}
		})

		describe('call showMenu with forward', () => {
			//{{{
			beforeEach(() => {
				navigator.instance().showMenu('back')
			})

			it('nothing should be checked', () => {
			})
			//}}}
		})

		describe('test navigator state transition', () => {
			//{{{
			describe('test menu state', () => {
				//{{{
				let spyShowMenu
				let spyHideMenu

				beforeEach(() => {
					spyShowMenu = jest.spyOn(navigator.instance(), 'showMenu')
					spyHideMenu = jest.spyOn(navigator.instance(), 'hideMenu')
				})

				it('default state should be invisible', () => {
					expect(navigator.instance().getMenuState()).toBe('invisible')
				})

				describe('call handleMouseEnterBack', () => {
					//{{{

					beforeEach(() => {
						navigator.instance().handleMouseEnterBack()
						expect(spyShowMenu).not.toHaveBeenCalled()
					})

					describe('runAllTimer, it will cuz hove on back button time is up', () => {
						//{{{
						beforeEach(() => {
							jest.runAllTimers()
						})

						it('navigator.showMenu(back) should be called', () => {
							expect(spyShowMenu).toHaveBeenCalledWith('back')
						})

						it('menuStatus.state should be backVisible', () => {
							expect(navigator.instance().getMenuState()).toBe('backVisible')
						})

						describe('click menu item to jump to it, call handleMenuClick with position(A)', () => {
							//{{{
							let position

							beforeEach(async () => {
								position = Position.buildByHashtagId(hashtagA._id)
								await navigator.instance().handleMenuClick(position)
							})

							it('goto should be called with:(position)', () => {
								expect(props.goto).toHaveBeenCalledWith(position.getKey(), position.getKeyAnchor())
							})
							//}}}
						})

						describe('call handleMouseEnterForward', () => {
							//{{{
							beforeEach(() => {
								navigator.instance().handleMouseEnterForward()
							})

							it('cuz back is visible aready, so should change to forward directly, so should call showMenu(forward)', () => {
								expect(spyShowMenu).toHaveBeenLastCalledWith('forward')
							})

							it('menuStatus.state should be forwardVisible', () => {
								expect(navigator.instance().getMenuState()).toBe('forwardVisible')
							})
							//}}}
						})

						describe('call handleMouseLeaveBack', () => {
							//{{{
							beforeEach(() => {
								navigator.instance().handleMouseLeaveBack()
							})

							describe('run timer', () => {
								//{{{
								beforeEach(() => {
									jest.runAllTimers()
								})

								it('hideMenu should be called', () => {
									expect(spyHideMenu).toHaveBeenCalledTimes(1)
								})

								it('menuStatus.state should be invisible', () => {
									expect(navigator.instance().getMenuState())
										.toBe('invisible')
								})
								//}}}
							})
							//}}}
						})

						describe('mouse enter menu, call handleMenuMouseEnter', () => {
							//{{{
							beforeEach(() => {
								navigator.instance().handleMenuMouseEnter()
							})

							describe('run timer', () => {
								//{{{
								beforeEach(() => {
									jest.runAllTimers()
								})

								it('cuz mouse on menu, so should not hide menu', () => {
									expect(spyHideMenu).not.toHaveBeenCalled()
								})

								it('menuStatus.state should be backVisible', () => {
									expect(navigator.instance().getMenuState())
										.toBe('backVisible')
								})

								describe('mouse leave menu, call handleMenuMouseLeave', () => {
									//{{{
									beforeEach(() => {
										navigator.instance().handleMenuMouseLeave()
									})

									describe('run timer', () => {
										//{{{
										beforeEach(() => {
											jest.runAllTimers()
										})

										it('hide menu should be called', () => {
											expect(spyHideMenu).toHaveBeenCalledTimes(1)
										})

										it('menuStatus.state should be invisible', () => {
											expect(navigator.instance().getMenuState())
												.toBe('invisible')
										})
										//}}}
									})
									//}}}
								})
								//}}}
							})
							//}}}
						})
						//}}}
					})
					//}}}
				})

				describe('hove on forward button, call handleMouseEnterForward', () => {
					//{{{

					beforeEach(() => {
						navigator.instance().handleMouseEnterForward()
					})

					describe('runAllTimer, it will cuz hove on back button time is up', () => {
						//{{{
						beforeEach(() => {
							jest.runAllTimers()
						})

						it('navigator.showMenu(forward) should be called', () => {
							expect(spyShowMenu).toHaveBeenCalledWith('forward')
						})

						describe('call handleMouseEnterBack', () => {
							//{{{
							beforeEach(() => {
								navigator.instance().handleMouseEnterBack()
							})

							it('cuz forward is visible aready, so should change to back directly, so should call showMenu(back)', () => {
								expect(spyShowMenu).toHaveBeenLastCalledWith('back')
							})
							//}}}
						})

						describe('call handleMouseLeaveForward', () => {
							//{{{
							beforeEach(() => {
								navigator.instance().handleMouseLeaveForward()
							})

							describe('run timer', () => {
								//{{{
								beforeEach(() => {
									jest.runAllTimers()
								})

								it('hide menu should be called', () => {
									expect(spyHideMenu).toHaveBeenCalledTimes(1)
								})
								//}}}
							})
							//}}}
						})
						//}}}
					})
					//}}}
				})
				//}}}
			})


			describe('setMenuState("forwardVisible") (test change menu state manually)', () => {
				//{{{
				beforeEach(() => {
					navigator.instance().setMenuState('forwardVisible')
				})

				it('menuState should be forwardVisible', () => {
					expect(navigator.instance().getMenuState()).toBe('forwardVisible')
				})
				//}}}
			})
			//}}}
		})

		describe('call breadcrumbsGoto with A', () => {
			//{{{
			beforeEach(async () => {
				await navigator.instance().breadcrumbsGoto(hashtagA._id)
			})

			it('goto should be called with A', () => {
				expect(props.goto).toHaveBeenCalledWith(hashtagA._id)
			})

			it('navigatorModel.visitHashtag should be called with A', () => {
				expect(props.getNavigatorModel().visitHashtag)
					.toHaveBeenCalledWith(hashtagA._id)
			})
			//}}}
		})

		describe('call handleClickBack', () => {
			//{{{
			beforeEach(async () => {
				const position = Position.buildByHashtagId(hashtagA._id)
				//$FlowFixMe
				props.getNavigatorModel().goBack = testUtils.jestPromise(position, 'goBack')
				await navigator.instance().handleClickBack()
			})

			it('goto should be called by A', () => {
				expect(props.goto).toHaveBeenCalledWith(hashtagA._id, undefined)
			})
			//}}}
		})

		describe('call handleClickForward', () => {
			//{{{
			beforeEach(async () => {
				const position = Position.buildByHashtagId(hashtagA._id)
				//$FlowFixMe
				props.getNavigatorModel().goForward = testUtils.jestPromise(position, 'goForward')
				await navigator.instance().handleClickForward()
			})

			it('goto should be called by A', () => {
				expect(props.goto).toHaveBeenCalledWith(hashtagA._id, undefined)
			})
			//}}}
		})

		describe('test render menu items: put item in navigator back, call showMenu', () => {
			//{{{
			let position

			beforeEach(() => {
				position = Position.buildByHashtagId(hashtagA._id)
				props.getNavigatorModel().getPositionsBack = testUtils.jestFn([position], 'getPositionsBack')
				navigator.instance().showMenu('back')
			})

			it('should be able to find a menu item under div.pop-menu-lis: <Hashtag/>', () => {
				expect(navigator.find('.pop-menu-lis').find(props.factoryComponent.Hashtag)).toHaveLength(1)
			})
			//}}}
		})
		//}}}
	})

	describe('shallow it with documentRoot:undefined (CASE: first login)', () => {
		//{{{
		let navigator

		beforeEach(() => {
			navigator = shallow(
				//$FlowFixMe
				<Navigator
					documentRoot={undefined}
					{...props}
				/>
			)
		})

		it('render should succeed', () => {
			expect(navigator.find('div').exists()).toBe(true)
		})
		//}}}
	})
	//}}}
})

describe('test NavigatorConnected', () => {
	//{{{
	beforeEach(() => {
	})

	it('shallow it, html render should pass', () => {
		shallow(
			<testUtils.Container>
				<NavigatorConnected
					goto={() => { }}
				/>
			</testUtils.Container>
		).html()
	})
	//}}}
})
