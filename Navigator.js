//@flow
/*
 * The model to control the navigator between document/hashtag 
 * The model:
 * //the navigator just like URL, 
 * //this is a URL to hashtag
 * [/u-[id]]/h-[id]
 * for current user, the user URL part is no need, just : /h-[id]
 *
 * //this is a URL to hashtag and at indicated note :
 * [/u-[id]]/h-[id]#n-[id]
 *
 * //this is a URL to a single note page
 * [/u-[id]]/n-[id]
 *
 * REVISE : change visit function to async, add save to every operation,
 * remove the goAndLoadDocument api, cuz load document is not the responsibility
 * of navigator
 *
 * REVISE Sat Jan 26 18:52:48 CST 2019
 * 	Fixed the problem: store the class rather then plain object into redux, 
 * 	before I change Position class to plain object then save to redux, so 
 * 	there are some flow error in this file, and I think is not safe to change 
 * 	class to object, may be have potential problem. 
 *
 */
import { utils } from '../utils/Utils.js'
import { type Store } from './store.js'
import { DBNote } from './DBNote.js'
import { StateNavigator } from './states/StateNavigator.js'
import { HashtagModel } from './HashtagModel.js'
import { ERROR } from '../error.js'
import { Hashtag } from './Hashtag.js'
import { Note } from './Note.js'

const log = require('loglevel').getLogger('../model/Navigator.js')



export class Navigator {
	_getDBNote: () => DBNote
	_getStateNavigator: () => StateNavigator
	_getHashtagModel: () => HashtagModel

	/* The key for db to save the navigator data */
	static DB_KEY = 'navigator'
	static DIRECTION = {
		back: 'back',
		forward: 'forward',
	}

	constructor(
		options: {
			_getDBNote: () => DBNote,
			_getStateNavigator: () => StateNavigator,
			_getHashtagModel: () => HashtagModel,
		}): Navigator {
		//{{{
		Object.assign(this, options)
		//check
		utils.isType(this._getDBNote, 'Function')
		utils.isType(this._getStateNavigator, 'Function')
		utils.isType(this._getHashtagModel, 'Function')
		return this
		//}}}
	}

	/*
	 * What is the logic of directly visit (not go forward or back) a hashtag?
	 * 	* first, cut off the history behind current cursor
	 * 	* find the list (previous) history, if found the hashtag, remove it from
	 * 	the list
	 * 	* add the hashtag at the end of the history list
	 */
	async visit(position: Position): Promise<boolean> {
		//{{{
		const label = 'Navigator -> visit'
		log.debug('%s:', label)
		//check
		utils.isTypeInstance(position, Position)
		//if there is forward, cut off it
		const navigator = this._getStateNavigator().get()
		if (navigator.current < navigator.histories.length - 1) {
			navigator.histories = navigator.histories.slice(0, navigator.current + 1);
		}
		//remove ,if already exist
		navigator.histories = navigator.histories.filter((itemOrg: Position) => !itemOrg.equal(position));
		if (navigator.current >= navigator.histories.length) {
			//cursor overflow
			navigator.current = navigator.histories.length - 1
		}
		navigator.histories.push(position)
		navigator.current++
		log.debug('navigator visited,the hisotries length increase to ', navigator.histories.length, 'and current cursor:', navigator.current)
		//update to redux
		utils.isType(this._getStateNavigator().save(navigator), true)
		//save
		utils.isType(
			await utils.a(() => utils.E(), this._save()),
			true
		)
		return true
		//}}}
	}

	/*
	 * Just a wrapper of visit(), given hashtag id, convert to Position
	 */
	async visitHashtag(hashtagId: string): Promise<boolean> {
		//{{{
		const label = 'Navigator -> visitHashtag'
		log.debug('%s:', label)
		Hashtag.checkId(hashtagId)
		const position = Position.buildByHashtagId(hashtagId)
		//tag*
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this.visit(position)),
			true,
		)
		return true
		//}}}
	}

	/* Record the current position , with a noteId */
	/*istanbul ignore next: TODO temporarily ignore*/
	async visitHashtagCurrentAnchorNoteId(noteId: string): Promise<boolean> {
		//{{{
		const label = 'Navigator -> visitHashtagCurrentAnchorNoteId'
		log.debug('%s:', label)
		Note.checkId(noteId)
		const position = this.getCurrentPosition()
		utils.isType(position.isNotePosition(), false)
		const positionNew = Position.buildByHashtagAndNoteId(
			position.getKey(),
			noteId)
		utils.isType(
			await utils.a(() => utils.E(), this.visit(positionNew)),
			true,
		)
		return true
		//}}}
	}

	/*istanbul ignore next: TODO temporarily ignore*/
	async visitNote(noteId: string): Promise<boolean> {
		//{{{
		const label = 'Navigator -> visitNote'
		log.debug('%s:', label)
		Note.checkId(noteId)
		const position = Position.buildByNoteId(noteId)
		utils.isType(
			await utils.a(() => utils.E(), this.visit(position)),
			true,
		)
		return true
		//}}}
	}

	hasBack(): boolean {
		//{{{
		const label = 'Navigator -> hasBack'
		log.debug('%s:', label)
		return this._getStateNavigator().get().current > 0
		//}}}
	}

	async goBack(): Promise<?Position> {
		//{{{
		const label = 'Navigator -> goBack'
		log.debug('%s:', label)
		if (!this.hasBack()) {
			log.debug('%s:do not hava back,return undefined', label)
			return undefined
		}
		const navigator = this._getStateNavigator().get()
		navigator.current--
		const position = navigator.histories[navigator.current]
		utils.isType(this._getStateNavigator().save(navigator), true)
		//save
		utils.isType(
			await utils.a(() => utils.E(), this._save()),
			true
		)
		return position
		//}}}
	}

	async goForward(): Promise<?Position> {
		//{{{
		const label = 'Navigator -> goForward'
		log.debug('%s:', label)
		if (!this.hasForward()) {
			return undefined
		}
		const navigator = this._getStateNavigator().get()
		navigator.current++
		const position = navigator.histories[navigator.current]
		utils.isType(this._getStateNavigator().save(navigator), true)
		//save
		utils.isType(
			await utils.a(() => utils.E(), this._save()),
			true
		)
		return position
		//}}}
	}

	hasForward(): boolean {
		//{{{
		const label = 'Navigator -> hasForward'
		log.debug('%s:', label)
		const navigator = this._getStateNavigator().get()
		return navigator.current < navigator.histories.length - 1
		//}}}
	}

	async jump(position: Position): Promise<?Position> {
		//{{{
		const label = 'Navigator -> jump'
		log.debug('%s:to %s', label, position)
		utils.isTypeInstance(position, Position)
		const navigator = this._getStateNavigator().get()
		for (let i = 0; i < navigator.histories.length; i++) {
			let positionTemp = navigator.histories[i];
			if (positionTemp.equal(position)) {
				navigator.current = i;
				log.debug('%s:found', label)
				utils.isType(this._getStateNavigator().save(navigator), true)
				//save
				utils.isType(
					await utils.a(() => utils.E(), this._save()),
					true
				)
				return positionTemp;
			}
		}
		log.error('%s:position not found', label)
		throw utils.E(ERROR.GENERAL_LOGICAL_ERROR)
		//}}}
	}

	getPositionsBack(): Array<Position> {
		//{{{
		const label = 'Navigator -> getPositionsBack'
		log.debug('%s:', label)
		if (!this.hasBack()) {
			log.debug('%s:there is no back', label)
			return []
		} else {
			const navigator = this._getStateNavigator().get()
			return navigator.histories.slice(0, navigator.current)
		}
		//}}}
	}

	getPositionsForward(): Array<Position> {
		//{{{
		const label = 'Navigator -> getPositionsForward'
		log.debug('%s:', label)
		if (!this.hasForward()) {
			log.debug('%s:there is no forward', label)
			return []
		} else {
			const navigator = this._getStateNavigator().get()
			return navigator.histories.slice(navigator.current + 1)
		}
		//}}}
	}

	size(): number {
		return this._getStateNavigator().get().histories.length
	}

	getCurrent(): number {
		return this._getStateNavigator().get().current
	}

	getCurrentPosition(): Position {
		const navigator = this._getStateNavigator().get()
		return navigator.histories[navigator.current]
	}

	/* to save the current status of navigator to db */
	async _save(): Promise<boolean> {
		//{{{
		const label = 'Navigator -> save'
		log.debug('%s:', label)
		/* load data first */
		let doc
		try {
			doc = await utils.a(/*istanbul ignore next*/() => utils.E(), this._getDBNote().get(Navigator.DB_KEY))
			utils.isType(doc, { _id: 'string' })
		} catch (e) {
			log.warn('e:', e.message)
			if (e.message === ERROR.GENERAL_NOT_FOUND) {
				log.debug('%s:the first time to save', label)
				doc = {
					_id: Navigator.DB_KEY
				}
			} else {
				e = utils.errorWrapper(e)
				throw e
			}
		}

		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this._getDBNote().put(Object.assign(doc, this.toObject()))),
			'defined'
		)
		return true
		//}}}
	}

	async load(): Promise<boolean> {
		//{{{
		const label = 'Navigator -> load'
		log.debug('%s:', label)
		let object: any
		try {

			const response = await this._getDBNote().get(Navigator.DB_KEY)
			utils.isType(
				response,
				{
					_id: 'string',
					histories: ['string'],
					current: 'number',
				})
			object = response
		} catch (e) {
			if (e.message === ERROR.GENERAL_NOT_FOUND) {
				log.debug('%s:there is no data', label)
				object = {
					current: 0,
					histories: ['/0']
				}
			} else {
				e = utils.errorWrapper(e)
				throw e
			}
		}
		//populate to this object
		const navigator = {}
		navigator.current = object.current
		navigator.histories = object.histories.map(path => {
			let result
			//			try{
			result = Position.parse(path)
			//			}catch(e){
			//				if(e.message === ERROR.NAVIGATOR_HISTORY_PARSE_FAILURE){
			//					log.debug('%s:get error when parse path, replace it with root hashtag', label)
			//					result		= Position.parse('/0')
			//				}else{
			//					throw e
			//				}
			//			}
			return result
		})
		utils.isType(this._getStateNavigator().save(navigator), true)
		//check the data
		utils.isType(
			await utils.a(() => utils.E(), this.checkNavigator()),
			'boolean'
		)
		return true
		//}}}
	}

	/* 
	 * Convert to plain object to save to db 
	 * return:
	 * {
	 * 		histories	: ['path','path',...]
	 * 		current		: 1,
	 * }
	 * */
	toObject(): Object {
		//{{{
		const label = 'Navigator -> toObject'
		log.debug('%s:', label)
		const navigator = this._getStateNavigator().get()
		return {
			_id: Navigator.DB_KEY,
			histories: navigator.histories.map(h => {
				return h.format()
			}),
			current: navigator.current,
		}
		//}}}
	}

	/*
	 * To check the histories and cursor data, by now, when user merge hashtag,
	 * then, the hashtag will be removed, so the navigator data maybe corrupt,
	 * need to check, and remove the stale hashtag
	 */
	async checkNavigator(): Promise<boolean> {
		//{{{
		const label = 'Navigator -> checkNavigator'
		log.debug('%s:', label)
		const navigator = this._getStateNavigator().get()
		const hashtagsStale = []
		for (let position of navigator.histories) {
			if (position.isNotePosition()) {
				log.debug('%s:there is no check code for note yet', label)
			} else {
				const hashtagId = position.getKey()
				log.trace('%s:check hashtag:%s', label, hashtagId)
				try {
					const hashtag = await utils.a(() => utils.E(), this._getHashtagModel().getHashtag(hashtagId))
				} catch (e) {
					if (e.message === ERROR.GENERAL_NOT_FOUND) {
						log.warn('%s:hashtag not found, should remove it from navigator:%s', label, hashtagId)
						hashtagsStale.push(hashtagId)
					} else {
						throw e
					}
				}
			}
		}
		if (hashtagsStale.length > 0) {
			log.warn(
				'%s:there is %d stale hashtag, to remove it',
				label,
				hashtagsStale.length
			)
			navigator.histories = navigator.histories.filter(position => {
				return hashtagsStale.every(id => id !== position.getKey())
			})
			//adjust the cursor if needed
			if (navigator.current >= navigator.histories.length) {
				navigator.current = navigator.histories.length - 1
			}
			/*
			 * Save to redux
			 */
			utils.isType(
				this._getStateNavigator().save(navigator),
				true
			)
			return false
		}
		return true
		//}}}
	}

	/*
	 * To clear all the histories, and save to db
	 */
	async clear(): Promise<boolean> {
		//{{{
		const label = 'Navigator -> clear'
		log.debug('%s:', label)
		const navigator = {}
		navigator.current = 0
		navigator.histories = [Position.parse('/0')]
		utils.isType(this._getStateNavigator().save(navigator), true)
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this._save()),
			true
		)
		return true
		//}}}
	}
}

export class Position {
	//{{{
	_isNote: boolean
	_key: string
	_keyAnchor: string

	construtor() {
	}

	static buildByHashtagId(hashtagId): Position {
		Hashtag.checkId(hashtagId)
		const position = new Position()
		position._key = hashtagId
		position._isNote = false
		return position
	}

	static buildByNoteId(noteId): Position {
		Note.checkId(noteId)
		const position = new Position()
		position._key = noteId
		position._isNote = true
		return position
	}

	static buildByHashtagAndNoteId(
		hashtagId: string,
		noteId: string
	): Position {
		Hashtag.checkId(hashtagId)
		Note.checkId(noteId)
		const position = new Position()
		position._key = hashtagId
		position._keyAnchor = noteId
		position._isNote = false
		return position
	}

	static parse(path: string): Position {
		//{{{
		const label = 'Position -> parse'
		log.debug('%s:with:%s', label, path)
		const elements = path.split(/[\/#]/).filter(e => e)
		log.debug('%s:split to %d part', label, elements.length)
		const position = new Position()
		if (elements.length === 1) {
			if (elements[0].match(/^t-[a-z0-9-]+$/) ||
				elements[0].match(/^0$/)
			) {
				log.debug('%s:is hashtag', label)
				Hashtag.checkId(elements[0])
				position._key = elements[0]
				position._isNote = false
			} else if (elements[0].match(/^n-[\w-]+$/)) {
				log.debug('%s:is note', label)
				Note.checkId(elements[0])
				position._key = elements[0]
				position._isNote = true
			} else {
				log.error('%s:bad history record:%s', label, path)
				throw utils.E(ERROR.NAVIGATOR_HISTORY_PARSE_FAILURE)
			}
		} else if (elements.length === 2) {
			if (elements[0].match(/^t-[\w-]+$/) ||
				elements[0].match(/^0$/)
			) {
				log.debug('%s:is hashtag', label)
				Hashtag.checkId(elements[0])
				position._key = elements[0]
				position._isNote = false
			} else if (elements[0].match(/^n-[\w-]+$/)) {
				log.debug('%s:is note', label)
				Note.checkId(elements[0])
				position._key = elements[0]
				position._isNote = true
			} else {
				log.error('%s:bad history record:%s', label, path)
				throw utils.E(ERROR.NAVIGATOR_HISTORY_PARSE_FAILURE)
			}
			if (elements[1].match(/^n-[\w-]+$/)) {
				log.debug('%s:add anchor', label)
				position._keyAnchor = elements[1]
			} else {
				log.error('%s:bad history record:%s', label, path)
				throw utils.E(ERROR.NAVIGATOR_HISTORY_PARSE_FAILURE)
			}
		} else {
			log.error('%s:bad history record:%s', label, path)
			throw utils.E(ERROR.NAVIGATOR_HISTORY_PARSE_FAILURE)
		}
		return position
		//}}}
	}

	/* if true, this is a note position , otherwise , it is 
	 * hashtag position */
	isNotePosition(): boolean {
		return this._isNote
	}

	/* The key of URL , note key or hashtag key*/
	getKey(): string {
		return this._key
	}

	/* If it is hashtag URL , there may be a anchor to a note */
	getKeyAnchor(): string {
		return this._keyAnchor
	}

	equal(position: Position): boolean {
		if (this._isNote === position._isNote &&
			this._key === position._key &&
			this._keyAnchor === position._keyAnchor) {
			return true
		} else {
			return false
		}
	}

	format(): string {
		//{{{
		const label = 'Position -> format'
		log.debug('%s:', label)
		if (this._isNote) {
			log.trace('%s:format note', label)
			return `/${this._key}`
		} else {
			log.trace('%s:format hashtag', label)
			if (this._keyAnchor) {
				log.trace('%s:with anchor', label)
				return `/${this._key}#${this._keyAnchor}`
			} else {
				return `/${this._key}`
			}
		}
		//}}}
	}
	//}}}
}
