//@flow
import loglevel		from 'loglevel'

import {Navigator,Position}	from './Navigator.js'
import {Hashtag}	from './Hashtag.js'
import {Note}		from './Note.js'
import {utils}		from '../utils/Utils.js'
import {StoreModel}	from './StoreModel.js'
import {FactoryTest}		from '../factory.js'
import {ERROR}		from '../error.js'
import {getStore}		from './store.js'
import {StateNavigator}		from './states/StateNavigator.js'
import * as testUtils		from '../testUtils.js'

const log		= loglevel.getLogger('../model/Navigator.test.js')
log.setLevel('trace')
loglevel.getLogger('../model/Navigator.js').setLevel('trace')


describe('Navigator', () => {
	//{{{
	const label		= 'Navigator -> test'
	let navigator
	let dbNote
	let store
	let stateNavigator
	let hashtagModel
	

	beforeEach(() => {
		dbNote		= {
			get		: testUtils.jestPromiseTrue(),
			put		: testUtils.jestPromise({}, 'put'),
		}
		store		= getStore()
		let _getStore		= () => store
		//use real state object
		stateNavigator		= new StateNavigator(_getStore)
		hashtagModel		= {
		}
		//$FlowFixMe
		navigator		= new Navigator({
			_getDBNote		: () => dbNote,
			_getStateNavigator		: () => stateNavigator,
			_getHashtagModel		: () => hashtagModel,
		})
	})

	describe('test basic navigator behavior, CASE: there are hashtags:A, B, C, D', () => {
		//{{{
		let hashtagA
		let hashtagB
		let hashtagC
		let hashtagD
		let hashtagMap
		/*
		 * a easy way to build the state of navigator
		 */
		function build(histories : Array<Hashtag>, current: number){
			//build the data
			navigator._getStateNavigator().save({
				histories		: histories.map(hashtag => {
					return Position.buildByHashtagId(hashtag._id)
				}),
				current,
			})
		}
		/*
		 * a convenient way to show the state of navigator
		 */
		function print():string{
			let result		= '['
			const {histories, current}		= 
				navigator._getStateNavigator().get()
			log.warn('!', histories)
			for(let i = 0; i < histories.length; i++){
				result		+= 
					`${i === current?'->':''}${hashtagMap[histories[i].getKey()].name}, `
			}
			result		+= ']'
			return result
		}
		function printHistories(histories : Array<Position>){
			let result		= '['
			for(let i = 0; i < histories.length; i++){
				result		+= 
					`${hashtagMap[histories[i].getKey()].name}, `
			}
			result		+= ']'
			return result
		}

		beforeEach(() => {
			hashtagA		= new Hashtag('A')
			hashtagB		= new Hashtag('B')
			hashtagC		= new Hashtag('C')
			hashtagD		= new Hashtag('D')
			hashtagMap		= {
				[hashtagA._id]		: hashtagA,
				[hashtagB._id]		: hashtagB,
				[hashtagC._id]		: hashtagC,
				[hashtagD._id]		: hashtagD,
			}
			//$FlowFixMe
			navigator._save		= testUtils.jestPromiseTrue('_save')
		})

		it('initial state is {histories:[], current:0}', () =>{
			expect(stateNavigator.get()).toEqual({histories:[], current:0})
		})

		describe('visitHashtag A', () => {
			//{{{
			beforeEach(async () => {
				utils.isType(
					await utils.a(() => utils.E(), navigator.visitHashtag(hashtagA._id)),
					true
				)
			})

			it('state is [->A] (-> means current)', () => {
				const state		= stateNavigator.get()
				expect(state.current).toBe(0)
				expect(state.histories).toHaveLength(1)
				expect(state.histories[0]._key).toBe(hashtagA._id)
			})

			describe('visitHashtag B', () => {
				//{{{
				beforeEach(async () => {
					utils.isType(
						await utils.a(() => utils.E(), navigator.visitHashtag(hashtagB._id)),
						true
					)
				})

				it('state is [A, ->B]', () => {
					const state		= stateNavigator.get()
					expect(state.current).toBe(1)
					expect(state.histories).toHaveLength(2)
					expect(state.histories[0]._key).toBe(hashtagA._id)
					expect(state.histories[1]._key).toBe(hashtagB._id)
				})

				it('hasBack should be true', () => {
					expect(navigator.hasBack()).toBe(true)
				})

				it('hasForward should be false', () => {
					expect(navigator.hasForward()).toBe(false)
				})

				it('size: should be 2', () => {
					expect(navigator.size()).toBe(2)
				})

				it('getCurrent: should be 1', () => {
					expect(navigator.getCurrent()).toBe(1)
				})

				it('getCurrentPosition should be B', () => {
					expect(navigator.getCurrentPosition().getKey()).toBe(hashtagB._id)
				})

				describe('visitHashtag C', () => {
					//{{{
					beforeEach(async () => {
						utils.isType(
							await utils.a(() => utils.E(), navigator.visitHashtag(hashtagC._id)),
							true
						)
					})

					it('state is [A, B, ->C]', () => {
						const state		= stateNavigator.get()
						expect(state.current).toBe(2)
						expect(state.histories).toHaveLength(3)
						expect(state.histories[0]._key).toBe(hashtagA._id)
						expect(state.histories[1]._key).toBe(hashtagB._id)
						expect(state.histories[2]._key).toBe(hashtagC._id)
					})

					describe('goBack', () => {
						//{{{
						beforeEach(async () => {
							await utils.a(() => utils.E(), navigator.goBack())
						})

						it('state is [A, ->B, C]', () => {
							const state		= stateNavigator.get()
							expect(state.current).toBe(1)
							expect(state.histories).toHaveLength(3)
							expect(state.histories[0]._key).toBe(hashtagA._id)
							expect(state.histories[1]._key).toBe(hashtagB._id)
							expect(state.histories[2]._key).toBe(hashtagC._id)
						})

						it('getPositionsForward: [A]', () => {
							expect(navigator.getPositionsForward()).toHaveLength(1)
						})

						it('getPositionsBack: [C]', () => {
							expect(navigator.getPositionsBack()).toHaveLength(1)
						})

						describe('goForward', () => {
							//{{{
							beforeEach(async () => {
								await utils.a(() => utils.E(), navigator.goForward())
							})

							it('state is [A, B, ->C]', () => {
								const state		= stateNavigator.get()
								expect(state.current).toBe(2)
								expect(state.histories).toHaveLength(3)
								expect(state.histories[0]._key).toBe(hashtagA._id)
								expect(state.histories[1]._key).toBe(hashtagB._id)
								expect(state.histories[2]._key).toBe(hashtagC._id)
							})
							//}}}
						})

						describe('visitHashtag D', () => {
							//{{{
							beforeEach(async () => {
								utils.isType(
									await utils.a(() => utils.E(), navigator.visitHashtag(hashtagD._id)),
									true
								)
							})

							it('state is [A, B, ->D]', () => {
								const state		= stateNavigator.get()
								expect(state.current).toBe(2)
								expect(state.histories).toHaveLength(3)
								expect(state.histories[0]._key).toBe(hashtagA._id)
								expect(state.histories[1]._key).toBe(hashtagB._id)
								expect(state.histories[2]._key).toBe(hashtagD._id)
							})
							//}}}
						})
						//}}}
					})

					describe('jump -> A', () => {
						//{{{
						beforeEach(async () => {
							const state		= stateNavigator.get()
							expect(state.histories[0]._key).toBe(hashtagA._id)
							await utils.a(() => utils.E(), navigator.jump(state.histories[0]))
						})

						it('state is [->A, B, C]', () => {
							const state		= stateNavigator.get()
							expect(state.current).toBe(0)
							expect(state.histories).toHaveLength(3)
							expect(state.histories[0]._key).toBe(hashtagA._id)
							expect(state.histories[1]._key).toBe(hashtagB._id)
							expect(state.histories[2]._key).toBe(hashtagC._id)
						})
						//}}}
					})

					//}}}
				})
				//}}}
			})
			//}}}
		})

		describe('CASE: [A, B, ->C]', () => {
			//{{{
			beforeEach(() => {
				build([hashtagA, hashtagB, hashtagC], 2)
			})

			it('print() navigator should be :[A, B, ->C, ]', () => {
				const result		= print()
				log.warn('!!!', result)
				expect(result).toBe('[A, B, ->C, ]')
			})

			it('visitHashtag(B) should be [A, C, ->B, ]', async () => {
				await navigator.visitHashtag(hashtagB._id)
				expect(print()).toBe('[A, C, ->B, ]')
			})

			it('visitHashtag(A) should be [B, C, ->A, ]', async () => {
				await navigator.visitHashtag(hashtagA._id)
				expect(print()).toBe('[B, C, ->A, ]')
			})

			it('goBackword() should be [A, ->B, C, ]', async () => {
				await navigator.goBack()
				expect(print()).toBe('[A, ->B, C, ]')
			})

			it('goForward() should be [A, B, ->C, ]', async () => {
				await navigator.goForward()
				expect(print()).toBe('[A, B, ->C, ]')
			})

			it('jump(B) should be [A, ->B, C, ], and should return a Position', async () => {
				const position		= navigator._getStateNavigator()
					.get()
					.histories[1]
				const result		= await navigator.jump(position)
				expect(result).toBeInstanceOf(Position)
				expect(print()).toBe('[A, ->B, C, ]')
			})
			//}}}
		})

		describe('CASE: [A, ->B, C]', () => {
			//{{{
			beforeEach(() => {
				build([hashtagA, hashtagB, hashtagC], 1)
			})

			it('print should be [A, ->B, C, ]', () => {
				expect(print()).toBe('[A, ->B, C, ]')
			})

			it('getPositionsForward() should get [C, ]', () => {
				expect(printHistories(navigator.getPositionsForward()))
					.toBe('[C, ]')
			})

			it('getPositionsBack() should get [A, ]', () => {
				expect(printHistories(navigator.getPositionsBack()))
					.toBe('[A, ]')
			})

			it('visitHashtag(D) should get [A, B, ->D, ]', async () => {
				await navigator.visitHashtag(hashtagD._id)
				expect(print()).toBe('[A, B, ->D, ]')
			})
			//}}}
		})

		describe('test toObject', () => {
			//{{{
			it('for initial, toObject should be: {histories:[], current:0}', () => {
				expect(navigator.toObject()).toEqual({
					_id		: Navigator.DB_KEY,
					current		: 0,
					histories		: [],
				})
			})

			describe('CASE: build [->B]', () => {
				//{{{
				beforeEach(() => {
					build([hashtagB], 0)
				})

				it('print should be [->B, ]', () => {
					expect(print()).toBe('[->B, ]')
				})

				it('toObject should be: ', () => {
					expect(navigator.toObject())
						.toMatchObject({
							histories		: [`/${hashtagB._id}`],
							current		: 0
						})
				})
				//}}}
			})
			//}}}
		})
		//}}}
	})



	describe('save', () => {
		//{{{
		describe('first save', () => {
			//{{{
			beforeEach(async () => {
				dbNote.get		= () => {
					log.warn('%s:mock get', label)
					return Promise.reject(utils.E(ERROR.GENERAL_NOT_FOUND))
				}
				utils.isType(
					await utils.a(() => utils.E(), navigator._save()),
					true
				)
			})

			it('put should be called with ', () => {
				expect(dbNote.put).toHaveBeenCalledWith({
					_id		: Navigator.DB_KEY,
					current		: 0,
					histories		: [],
				})
			})
			//}}}
		})

		describe('non-first save, and current = 1', () => {
			//{{{
			beforeEach(async () => {
				dbNote.get		= jest.fn(() => {
					log.warn('%s:mock get', label)
					return Promise.resolve({
						_id		: Navigator.DB_KEY,
						current		: 0,
					})
				})
				//$FlowFixMe
				navigator._getStateNavigator().get		= testUtils.jestFn(
					{
						histories		: [],
						current		: 1,
					}
				)
				utils.isType(
					await utils.a(() => utils.E(), navigator._save()),
					true
				)
			})

			it('put should be called with {...,current:1}', () => {
				expect(dbNote.put).toHaveBeenCalledWith({
					_id		: Navigator.DB_KEY,
					current		: 1,
					histories		: [],
				})
			})
			//}}}
		})
		//}}}
	})

	describe('load', () => {
		//{{{
		beforeEach(() => {
			//$FlowFixMe
			navigator.checkNavigator		= testUtils.jestPromiseTrue()
		})

		describe('load at the first time', () => {
			//{{{
			let spySave
			beforeEach(async () => {
				spySave		= jest.spyOn(stateNavigator, 'save')
				dbNote.get		= jest.fn(() => {
					log.warn('%s:mock get not found', label)
					return Promise.reject(utils.E(ERROR.GENERAL_NOT_FOUND))
				})
				utils.isType(
					await utils.a(() => utils.E(), navigator.load()),
					true
				)
			})

			it('should set redux/state with {current:0, position:/0}', () => {
				testUtils.expectImproved(spySave)
					.toHaveBeenLastCalledWithMatch({
						current		: 0,
						histories		: [{
							_key		: '0',
						}]
					})
			})
			//}}}
		})

		describe('load at the non-first time with data: {current:1, histories:{tag1, tag2}', () => {
			//{{{
			let spySave
			let hashtagA
			let hashtagB
			let state

			beforeEach(async () => {
				hashtagA		= new Hashtag('A')
				hashtagB		= new Hashtag('B')
				state		= {
					_id		: Navigator.DB_KEY,
					current		: 1,
					histories		: [
						`/${hashtagA._id}`,
						`/${hashtagB._id}`,
					]
				}
				spySave		= jest.spyOn(stateNavigator, 'save')
				dbNote.get		= jest.fn(() => {
					log.warn('%s:mock get not found', label)
					return Promise.resolve(state)
				})
				utils.isType(
					await utils.a(() => utils.E(), navigator.load()),
					true
				)
			})

			it('should set redux/state with {current:1, histories:[Position, Position]}', () => {
				testUtils.expectImproved(spySave)
					.toHaveBeenLastCalledWithMatch(
						{
							current		: 1,
							histories		: [
								expect.any(Position), 
								expect.any(Position)
							],
						}
					)
			})

			describe('CASE: dbNote.get return {current:0, histories:["/xxx"]}, change the return state from db to a wrong result', () => {
				//{{{
				beforeEach(() => {
					state.histories		= ['/x']
				})

				it('load() should throw error, cuz parse the data fail', async () => {
					try{
						await navigator.load()
						expect('fail').toBe(true)
					}catch(e){
						expect(e.message === ERROR.NAVIGATOR_HISTORY_PARSE_FAILURE)
					}
				})
				//}}}
			})
			//}}}
		})

		
		//}}}
	})

	describe('test checkNavigator', () => {
		//{{{
		let hashtagA
		let hashtagB
		let hashtagByIds
		beforeEach(() => {
			hashtagA		= new Hashtag('A')
			hashtagB		= new Hashtag('B')
			hashtagByIds		= {
				[hashtagA._id]		: hashtagA,
				[hashtagB._id]		: hashtagB,
			}
		})

		describe('data: [A, ->B]', () => {
			//{{{
			beforeEach(() => {
				stateNavigator.save({
					current		: 1,
					histories		: [
						Position.buildByHashtagId(hashtagA._id),
						Position.buildByHashtagId(hashtagB._id),
					],
				})
				hashtagModel.getHashtag		= (e) => {
					log.warn('%s:mock getHashtag', label)
					const result		= hashtagByIds[e]
					if(result){
						return Promise.resolve(result)
					}else{
						return Promise.reject(utils.E(ERROR.GENERAL_NOT_FOUND))
					}
				}
			})

			it('current === 1', () => {
				expect(navigator.getCurrent()).toBe(1)
			})

			describe('checkNavigator', () => {
				//{{{
				beforeEach(async () => {
					utils.isType(
						await utils.a(() => utils.E(), navigator.checkNavigator()),
						true
					)
				})

				it('current === 1', () => {
					expect(navigator.getCurrent()).toBe(1)
				})

				it('size === 2', () => {
					expect(navigator.size()).toBe(2)
				})

				describe('remove B, and check again', () => {
					//{{{
					beforeEach(async () => {
						delete hashtagByIds[hashtagB._id]
						utils.isType(
							await utils.a(() => utils.E(), navigator.checkNavigator()),
							'boolean',
						)
					})

					it('current === 0', () => {
						expect(navigator.getCurrent()).toBe(0)
					})

					it('size === 1', () => {
						expect(navigator.size()).toBe(1)
					})

					//}}}
				})

				//}}}
			})
			//}}}
		})
		//}}}
	})

	describe('test clear', () => {
		//{{{
		beforeEach(() => {
		})

		describe('clear', () => {
			//{{{
			let spySave
			beforeEach(async () => {
				//$FlowFixMe
				navigator._save		= testUtils.jestPromiseTrue()
				spySave		= jest.spyOn(stateNavigator, 'save')
				utils.isType(
					await utils.a(() => utils.E(), navigator.clear()),
					true
				)
			})

			it('state should be saved with:{current:0, histories:["0"]}', () => {
				const parameter		= spySave.mock.calls[0][0]
				expect(parameter).toMatchObject({
					current		: 0,
					histories		: [
						{
							_key		: '0',
						}
					],
				})
			})
			//}}}
		})
		//}}}
	})
	//}}}
})


describe('Position', () => {
	//{{{
	let position
	beforeEach(() => {
	})

	describe('buildByHashtagId(hashtag._id) build by hashtag', () => {
		//{{{
		let hashtag
		beforeEach(() => {
			hashtag		= new Hashtag('tag')
			position		= Position.buildByHashtagId(hashtag._id)
		})

		it('position.key === tag._id', () => {
			expect(position.getKey()).toBe(hashtag._id)
		})

		it('position.isNotePosition === false', () => {
			expect(position.isNotePosition()).toBe(false)
		})

		it('format === /[tag._id]', () => {
			expect(position.format()).toBe(`/${hashtag._id}`)
		})

		describe('parse(position.format())', () => {
			//{{{
			let positionParsed
			beforeEach(() => {
				positionParsed		= Position.parse(position.format())
			})

			it('parsed position.key === tag._id', () => {
				expect(positionParsed.getKey()).toBe(hashtag._id)
			})

			it('parsed position isNotePosition === false', () => {
				expect(positionParsed.isNotePosition()).toBe(false)
			})
			//}}}
		})
		//}}}
	})

	describe('test parse', () => {
		//{{{
		beforeEach(() => {
		})

		it('parse("x") should throw error', () => {
			expect(() => {
				Position.parse('x')
			}).toThrow(ERROR.NAVIGATOR_HISTORY_PARSE_FAILURE)
		})
		//}}}
	})

	describe('build by note', () => {
		//{{{
		let note
		beforeEach(() => {
			note		= new Note()
			position		= Position.buildByNoteId(note._id)
		})

		it('position.key === note._id', () => {
			expect(position.getKey()).toBe(note._id)
		})

		it('position.isNotePosition === true', () => {
			expect(position.isNotePosition()).toBe(true)
		})

		it('format === /[note._id]', () => {
			expect(position.format()).toBe(`/${note._id}`)
		})

		describe('parse(position.format())', () => {
			//{{{
			let positionParsed
			beforeEach(() => {
				positionParsed		= Position.parse(position.format())
			})

			it('parsed position.key === note._id', () => {
				expect(positionParsed.getKey()).toBe(note._id)
			})

			it('parsed position isNotePosition === true', () => {
				expect(positionParsed.isNotePosition()).toBe(true)
			})
			//}}}
		})
		//}}}
	})

	describe('build by anchor', () => {
		//{{{
		let note
		let hashtag
		beforeEach(() => {
			hashtag		= new Hashtag('tag')
			note		= new Note()
			position		= Position.buildByHashtagAndNoteId(
				hashtag._id,
				note._id
			)
		})

		it('position.key === hashtag._id', () => {
			expect(position.getKey()).toBe(hashtag._id)
		})

		it('position.getKeyAnchor === note._id', () => {
			expect(position.getKeyAnchor()).toBe(note._id)
		})

		it('position.isNotePosition === false', () => {
			expect(position.isNotePosition()).toBe(false)
		})

		it('format === /[tag._id]#[note._id]', () => {
			expect(position.format()).toBe(`/${hashtag._id}#${note._id}`)
		})

		describe('parse', () => {
			//{{{
			let positionParsed
			beforeEach(() => {
				positionParsed		= Position.parse(position.format())
			})

			it('parsed position.key === tag._id', () => {
				expect(positionParsed.getKey()).toBe(hashtag._id)
			})

			it('parsed position.keyAnchor === note._id', () => {
				expect(positionParsed.getKeyAnchor()).toBe(note._id)
			})

			it('parsed position isNotePosition === false', () => {
				expect(positionParsed.isNotePosition()).toBe(false)
			})
			//}}}
		})
		//}}}
	})
	//}}}
})
