//@flow
/* The model of hashtag */
import { type Store } from './store.js'
import { ERROR } from '../error.js'
import { User } from './User.js'
import { DBNote } from './DBNote.js'
import { Hashtag } from './Hashtag.js'
import { utils } from '../utils/Utils.js'
import { NoteHashtag } from './NoteHashtag.js'
import { Note } from './Note.js'
import { Navigator as NavigatorModel } from './Navigator.js'
import { HashtagAlias } from './HashtagAlias.js'
import { NoteModel } from './NoteModel.js'
import { StateHashtag } from './states/StateHashtag.js'
import { HashtagIdCurrent } from './states/HashtagIdCurrent.js'

const log = require('loglevel').getLogger('../model/HashtagModel.js')

export class HashtagModel {
	/*
	 * Injection of module
	 */
	_getNoteModel: () => NoteModel
	_getDBNote: () => DBNote
	_getStateHashtag: () => StateHashtag
	_getHashtagIdCurrent: () => HashtagIdCurrent
	_getNavigatorModel: () => NavigatorModel

	constructor(
		options: {
			_getNoteModel: () => NoteModel,
			_getDBNote: () => DBNote,
			_getStateHashtag: () => StateHashtag,
			_getHashtagIdCurrent: () => HashtagIdCurrent,
			_getNavigatorModel: () => NavigatorModel,
		}
	): HashtagModel {
		//{{{
		//bind
		utils.isType(options._getNoteModel, 'Function')
		utils.isType(options._getDBNote, 'Function')
		utils.isType(options._getStateHashtag, 'Function')
		utils.isType(options._getHashtagIdCurrent, 'Function')
		utils.isType(options._getNavigatorModel, 'Function')
		Object.assign(this, options)
		return this
		//}}}
	}


	/******** member function ******/
	/*
	 * Create a new hashtag, and update the hashtag to redux store
	 */
	async createHashtag(hashtag: Hashtag): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> createHashtag'
		log.debug('%s:with:%s', label, hashtag && hashtag._id)
		utils.isTypeInstance(hashtag, Hashtag)
		//make sure the name of this hashtag is OK
		utils.isType(
			this.checkHashtagName(hashtag),
			true
		)
		//first , need to check the tags in definition
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this._getNoteModel().noteHashtagUpdate(hashtag.getDefinition())),
			true,
		)
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this.checkParents(hashtag)),
			true
		)
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this.checkAncestor(hashtag)),
			true
		)
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this._getDBNote().putHashtag(hashtag)),
			true
		)
		/* 
		 * After save , update the redux 
		 */
		utils.isType(
			this._getStateHashtag().saveHashtag(hashtag),
			true
		)
		return true
		//}}}
	}

	async hashtagUpdate(hashtag: Hashtag): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> hashtagUpdate'
		log.debug('%s:with:%s', label, hashtag && hashtag._id)
		//check
		utils.isTypeInstance(hashtag, Hashtag)
		utils.isType(
			this.checkHashtagName(hashtag),
			true
		)
		//first , need to check the tags in definition
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this._getNoteModel().noteHashtagUpdate(hashtag.getDefinition())),
			true
		)
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this.checkParents(hashtag)),
			true
		)
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this.checkAncestor(hashtag)),
			true
		)
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this._getDBNote().putHashtag(hashtag)),
			true
		)
		//Need to re-create the hashtag , because need to fresh redux to make 
		//component get informed the hashtag changed
		const hashtagClone = Hashtag.genHashtagByObject(hashtag)
		utils.isType(
			this._getStateHashtag().saveHashtag(hashtagClone),
			true
		)
		return true
		//}}}
	}

	/* 
	 * check the parents fields according the definition 
	 * update the hashtag to have correctly parents, and 
	 * update the parents hashtag to have this hashtag as child
	 *
	 * Note, for the LOST of the parents child (cuz it disappear in this tag
	 * definition), it will be handle in update complex fn below, so, here
	 * just handle the case that parents add child.
	 * TODO maybe it is not good to place this fn in hashtagUpdate, I should 
	 * cut off it and move these code to complexUpdate, put them with LOST/
	 * drop logic together.
	 */
	async checkParents(hashtag: Hashtag): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> checkParents'
		log.debug('%s:', label)
		utils.isTypeInstance(hashtag, Hashtag)
		/*
		 * scan and get all the hashtag in definition
		 */
		let parentsInDefinition: Array<Hashtag> = []
		if (hashtag.getDefinition()) {
			parentsInDefinition =
				Object.values(hashtag.getDefinition().noteHashtagMap)
					.map(noteHashtag => {
						//$FlowFixMe
						const parent = noteHashtag.getHashtag()
						return parent
					})
			log.debug(
				'%s:find parents %d in definition',
				label,
				parentsInDefinition.length
			)
		}
		hashtag.setParents(parentsInDefinition.map(hashtag => hashtag._id))

		/*
		 * for hashtag in definition, check all of them, add current hashtag as 
		 * child to them
		 */
		for (let i = 0; i < parentsInDefinition.length; i++) {
			const parent = parentsInDefinition[i]
			const children = parent.getChildren()
			if (children.indexOf(hashtag._id) >= 0) {
				log.trace('%s:child exist,skip', label)
			} else {
				log.trace('%s:child lost,add', label)
				children.push(hashtag._id)
				parent.setChildren(children)
				//save
				utils.isType(
					await utils.a(/*istanbul ignore next*/() => utils.E(), this.hashtagUpdate(parent)),
					true
				)
			}
		}
		return true
		//}}}
	}

	/*
	 * after the parents was set , need to update the 
	 * ancestor field of hashtag, the logic is:
	 * go through all the parents, append all its ancestor 
	 * to current hashtag, include the parents themselves, 
	 */
	async checkAncestor(hashtag: Hashtag): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> checkAncestor'
		log.trace('%s:', label)
		//check
		utils.isTypeInstance(hashtag, Hashtag)
		const parents = hashtag.getParents()
		log.trace(
			'%s:add parents %d as ancestor',
			label,
			parents.length
		)
		let ancestor = [...parents]
		if (parents && parents.length > 0) {
			for (let i = 0; i < parents.length; i++) {
				const parentId = parents[i]
				const hashtagParent = await utils.a(() => utils.E(), this.getHashtag(parentId))
				const ancestorParent = hashtagParent.getAncestor()
				log.trace('%s:add parents\' ancestor %d', label,
					ancestorParent.length)
				ancestor.push(...ancestorParent)
			}
		} else {
			log.trace('%s:parents is empty,skip ancestor check', label)
		}
		log.trace('%s:get ancestor:%d', label, ancestor.length)
		hashtag.setAncestor(ancestor)
		return true
		//}}}
	}

	/*
	 * Try to load all the hashtags from db, add convert to raw json from db
	 * to real class/object
	 */
	async load(): Promise<boolean> {
		const label = 'HashtagModel -> load'
		log.debug(label)
		let hashtags = await this._getDBNote().getHashtags()
		log.debug('%s,load hashtags:%s', label, hashtags.length)
		/*
		 * set to redux
		 */
		utils.isType(
			this._getStateHashtag().saveHashtags(hashtags),
			true
		)
		/*
		 * here to check the hashtag definition fields, to make sure the hashtag 
		 * ref was attach to the noteHashtag
		 */
		//TODO  maybe the hashtag pure object was store into DB, 
		//need to remove it from the definition's noteHashtag
		log.debug('%s:to check definition noteHashtag hashtag', label)
		for (let i = 0; i < hashtags.length; i++) {
			const hashtag = hashtags[i]
			const definition = hashtag.getDefinition()
			if (definition) {
				for (let noteHashtagId in definition.noteHashtagMap) {
					const noteHashtag = definition.noteHashtagMap[noteHashtagId]
					let hashtag = noteHashtag.getHashtag()
					if (!hashtag || !hashtag.getChildren) {
						log.debug(
							'%s:the hashtag is not OK, insert new one for :%o',
							label,
							noteHashtag.hashtagId,
						)
						hashtag = await utils.a(() => utils.E(), this.getHashtag(noteHashtag.hashtagId))
						utils.isType(hashtag, 'Hashtag')
						noteHashtag.setHashtag(hashtag)
					}
				}
			}
		}
		return true
	}

	/*
	 * get hashtag from:
	 * 	* first, get from redux, if not exist
	 * 	* from db
	 */
	async getHashtag(hashtagId: string): Promise<Hashtag> {
		//{{{
		const label = 'HashtagModel -> getHashtag'
		log.debug('%s:', label)
		Hashtag.checkId(hashtagId)
		let result = this._getStateHashtag().getHashtagById(hashtagId)
		if (!result) {
			log.debug('%s:do not in redux cache:%s', label, hashtagId)
			result = await this._getDBNote().getHashtag(hashtagId)
			utils.isType(result, 'Hashtag')
			utils.isType(
				this._getStateHashtag().saveHashtag(result),
				true
			)
		}
		return result
		//}}}
	}

	/* Sync way to get hashtag, just search the cache , do not visit DB */
	getHashtagSync(hashtagId: string): Hashtag {
		//{{{
		const label = 'HashtagModel -> getHashtagSync'
		log.debug('%s:', label)
		Hashtag.checkId(hashtagId)
		let result = this._getStateHashtag().getHashtagById(hashtagId)
		if (!result) {
			log.debug('%s:do not in redux cache:%s', label, hashtagId)
			throw utils.E(ERROR.GENERAL_NOT_FOUND)
		}
		return result
		//}}}
	}

	getHashtagByNameSync(hashtagName: string): Hashtag {
		//{{{
		const label = 'HashtagModel -> getHashtagSync'
		log.debug('%s:', label)
		utils.isType(hashtagName, 'string')
		let result = this._getStateHashtag().getHashtagByName(hashtagName)
		if (!result) {
			log.debug('%s:do not in redux cache:%s', label, hashtagName)
			throw utils.E(ERROR.GENERAL_NOT_FOUND)
		}
		return result
		//}}}
	}

	/* 
	 * To check the db if the special hashtag was been registered,
	 * if not , register/insert it 
	 * NOTE, by now, the check is to be done on the redux, that means, 
	 * all the hashtag need to be load to memory(redux) first!
	 * REVISE: add options: test
	 */
	/*istanbul ignore next: no need to test*/
	async checkSpecialHashtag(
		options: {
			isTest: boolean,
		} = {
				isTest: true
			}
	): Promise<{
		//if every special hashtag is correct?
		result: boolean,
		//how many hashtag have been created
		countCreated: number,
		//how many hashtag have been modified
		countModified: number,
		//The count of special hashtag definition in hashtag class
		countExpected: number,
		//The existed in db already
		countExisted: number,
		//The count of wrong hashtag which exist but the content is corrupt
		countWrong: number,
	}> {
		//{{{
		const label = 'HashtagModel -> checkSpecialHashtag'
		log.debug('%s:', label)
		/*
		 * Before work, check if the hashtags were loaded
		 */
		if (this._getStateHashtag().getHashtags().length === 0) {
			log.debug('%s:hashtags do not load, load it!', label)
			utils.isType(
				await utils.a(() => utils.E(), this.load()),
				true
			)
		}
		let result: any = {}
		result.result = true
		result.countExisted = 0
		result.countCreated = 0
		result.countModified = 0
		result.countExpected = 0
		result.countWrong = 0
		for (let hashtagName in Hashtag.SPECIAL_HASHTAGS) {
			result.countExpected++
			log.debug('%s:to check:%s', label, hashtagName)
			//$FlowFixMe
			const hashtag = Hashtag.SPECIAL_HASHTAGS[hashtagName].build()
			/*
			 * check if the special hashtag exist in redux, if not , create,
			 * if true, still need to check some other things, like: doc hashtag
			 * data type have been changed from text area to combination type,
			 * so, need to check if the type is correct
			 */
			const hashtagInRedux = this._getStateHashtag().getHashtagByName(hashtag.name)
			if (!hashtagInRedux) {
				result.result = false
				if (options.isTest === false) {
					log.debug('%s:to create missed hashtag', label)
					result.countCreated++
					try {
						const ok = await this.createHashtag(hashtag)
						if (ok !== true) {
							const e = utils.errorWrapper('create special hashtag fail')
							throw e
						}
					} catch (e) {
						e = utils.errorWrapper(e)
						throw e
					}
				}
			} else {
				result.countExisted++
				log.debug('%s:special tag:%s existed', label, hashtag.name)
				/*
				 * Check: the data type is equal to the definition in Hashtag 
				 * class
				 */
				let isCorrect = true
				if (hashtag.dataType) {
					if (
						hashtag.dataType.type &&
						hashtagInRedux.dataType &&
						hashtagInRedux.dataType.type &&
						hashtag.dataType.type === hashtagInRedux.dataType.type
					) {
						log.debug('%s:OK, the data type is equal', label)
					} else {
						log.debug('%s:dataType wrong', label)
						isCorrect = false
					}
				} else {
					if (hashtagInRedux.dataType) {
						log.debug('%s:the hashtag should not have dataType',
							label
						)
						isCorrect = false
					}
				}
				if (isCorrect === false) {
					result.countWrong++
					result.result = false
					if (options.isTest === false) {
						log.debug('%s:try to reset the wrong hashtag', label)
						result.countModified++
						//just modify the dataType
						hashtagInRedux.dataType = hashtag.dataType
						log.trace('%s:the new hashtag to store to db:%o',
							label,
							hashtagInRedux
						)
						utils.isType(
							await utils.a(() => utils.E(), this.hashtagUpdate(hashtagInRedux)),
							true
						)
					}
				}
			}
		}
		log.debug('%s:the result of check:%o', label, result)
		return result
		//}}}
	}

	/* 
	 * To match the text for hashtag name, 
	 * This is the simplest version for auto complete, 
	 * TODO maybe there is performance problem
	 * */
	autoComplete(
		text: string,
		options: {
			isSpecialHashtagEnabled?: boolean,
		} = {
			},
	): Array<Hashtag | HashtagAlias> {
		//{{{
		const label = 'HashtagModel -> autoComplete'
		log.debug('%s:', label)
		//default
		options = Object.assign(
			{
				isSpecialHashtagEnabled: false,
			},
			options,
		)
		const result = []
		/*
		 * REVISE Wed Jan 23 11:30:29 CST 2019
		 * 	If text is empty, then result is empty too
		 */
		if (text.trim() === '') {
			return result
		}
		const hashtags = this._getStateHashtag().getHashtags()
		text = text.toLowerCase()
		for (let hashtag of hashtags) {
			//skip some hashtag
			if (hashtag.name === 'Midilink') {
				continue
			}
			//skip the special hashtag 
			//$FlowFixMe
			if (Hashtag.SPECIAL_HASHTAGS[hashtag.name] &&
				options.isSpecialHashtagEnabled === false
			) {
				continue
			}
			if (hashtag.name.toLowerCase().indexOf(text) >= 0) {
				result.push(hashtag)
			} else if (hashtag.getTriggers().some(trigger => {
				return trigger.toLowerCase().indexOf(text) >= 0
			})) {
				result.push(hashtag)
			} else {
				hashtag.getAliases().forEach(hashtagAlias => {
					if (hashtagAlias.getName().toLowerCase().indexOf(text) >= 0) {
						result.push(hashtagAlias)
					}
				})
			}
		}
		return result
		//}}}
	}

	/* Get the list of recently created hashtags */
	getHashtagsRecentlyCreated(count: number): Array<Hashtag> {
		//{{{
		const label = 'HashtagModel -> getHashtagsRecentlyCreated'
		log.debug('%s:', label)
		const result = []
		return this._getStateHashtag()
			.getHashtags()
			.filter(hashtag => {
				//$FlowFixMe
				if (Hashtag.SPECIAL_HASHTAGS[hashtag.name]) {
					return false
				} else {
					return true
				}
			})
			.sort((a, b) => {
				return b.createdTime - a.createdTime
			})
			.slice(0, count)
		//}}}
	}

	/* Get the whole index list of hashtags , order by name (dictionary order)*/
	getHashtagsIndex(): Array<Hashtag> {
		//{{{
		const label = 'HashtagModel -> getHashtagsIndex'
		log.debug('%s:', label)
		return this._getStateHashtag().getHashtags()
			.filter(hashtag => {
				//$FlowFixMe
				if (Hashtag.SPECIAL_HASHTAGS[hashtag.name]) {
					return false
				} else {
					return true
				}
			})

		//}}}
	}

	/* 
	 * Check if the hashtag name is OK when:
	 * 		* The name was not used by other hashtag
	 * 		* The name was not used as alias of others (for stateHashtag, 
	 * 		getHashtagByName will include the alias name)
	 */
	checkHashtagName(hashtag: Hashtag): true {
		//{{{
		const label = 'HashtagModel -> checkHashtagName'
		log.trace('%s:', label)
		let hashtagFound = this._getStateHashtag().getHashtagByName(hashtag.name)
		/*
		 * REVISE Sat Jun 15 17:54:45 CST 2019
		 * 	Exclude the special hashtag, because I need to remove some duplicated
		 * 	special hashtag, and it will throw error from there.
		 */
		if (hashtagFound && hashtagFound._id !== hashtag._id && !hashtag.isSpecialHashtag()) {
			log.error(
				'%s:the id is duplicated',
				label,
				hashtagFound,
			)
			throw utils.E(ERROR.MODEL_HASHTAG_NAME_DUPLICATED)
		}
		return true
		//}}}
	}

	/* 
	 * To move the child of a hashtag, move the child to before/after another
	 * child, that means: just move the order of hashtag
	 */
	async moveChild(
		hashtagIdParent: string,
		hashtagIdChildToMove: string,
		hashtagIdChildToDock: string,
		direction: 'before' | 'after'
	): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> moveChild'
		log.debug('%s:', label)
		Hashtag.checkId(hashtagIdParent)
		Hashtag.checkId(hashtagIdChildToMove)
		Hashtag.checkId(hashtagIdChildToDock)
		const hashtag = this.getHashtagSync(hashtagIdParent)
		utils.isType(hashtag, 'Hashtag')
		let children = hashtag.getChildren()
		const indexOfChildToMove = children.indexOf(hashtagIdChildToMove)
		let indexOfChildToDock = children.indexOf(hashtagIdChildToDock)
		/*
		 * if move,dock is the same, then no need do anything, just quit
		 */
		if (hashtagIdChildToMove === hashtagIdChildToDock) {
			log.warn(
				'%s:the two tag is the same, quit, %s,%s',
				label,
				hashtagIdChildToMove,
				hashtagIdChildToDock,
			)
			return true
		}
		/*
		 * make sure the two hashtag both in the parent children list
		 */
		if (
			indexOfChildToMove < 0 ||
			indexOfChildToDock < 0
		) {
			log.warn(
				'%s:not found:%s,%s',
				label,
				hashtagIdChildToMove,
				hashtagIdChildToDock
			)
			throw utils.E(ERROR.GENERAL_LOGICAL_ERROR)
		}
		//move
		//remove the child to move first
		children = [...children.slice(0, indexOfChildToMove),
		...children.slice(indexOfChildToMove + 1)]
		indexOfChildToDock = children.indexOf(hashtagIdChildToDock)
		if (direction === 'before') {
			log.debug('%s:insert before', label)
			//insert
			children = [...children.slice(0, indexOfChildToDock),
				hashtagIdChildToMove,
			...children.slice(indexOfChildToDock)]
		} else if (direction === 'after') {
			log.debug('%s:insert after', label)
			//insert
			if (indexOfChildToDock === children.length - 1) {
				log.trace('%s:the last one, append directly', label)
				children.push(hashtagIdChildToMove)
				log.warn('to return :', children)
			} else {
				children = [...children.slice(0, indexOfChildToDock + 1),
					hashtagIdChildToMove,
				...children.slice(indexOfChildToDock + 1)]
			}
		} else/*istanbul ignore next*/ {
			throw utils.E(ERROR.GENERAL_LOGICAL_ERROR)
		}
		hashtag.setChildren(children)

		//save to database
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this.hashtagUpdate(hashtag)),
			true
		)
		return true
		//}}}
	}

	/* 
	 * stick a hashtag to hashtag:
	 * set hashtag's stick list add new note 
	 */
	async stickHashtag(hashtagIdTarget: string, hashtagIdSticky: string): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> stickHashtag'
		log.debug('%s:', label)
		let hashtag
		hashtag = this.getHashtagSync(hashtagIdTarget)
		utils.isType(hashtag, 'Hashtag')
		utils.isType(hashtag.stickHashtag(hashtagIdSticky), true)
		utils.isType(
			await utils.a(() => utils.E(), this.hashtagUpdate(hashtag)),
			true
		)
		return true
		//}}}
	}

	/* 
	 * A convenient way to stickHashtag, the target hashtag is just current 
	 * hashtag, internal, use  stickHashtag to do things 
	 */
	async stickHashtagCurrent(hashtagId: string): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> stickHashtagCurrent'
		const hashtagIdCurrent = this._getHashtagIdCurrent().get()
		/*istanbul ignore if*/
		if (!hashtagIdCurrent) {
			throw utils.E(ERROR.GENERAL_NOT_FOUND)
		}
		const ok = await utils.a(() => utils.E(), this.stickHashtag(
			hashtagIdCurrent,
			hashtagId))
		log.debug('%s:', label)
		return true
		//}}}
	}

	async unstickHashtag(
		hashtagIdTarget: string,
		hashtagIdSticky: string
	): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> unstickHashtag'
		log.debug('%s:', label)
		let hashtag
		hashtag = this.getHashtagSync(hashtagIdTarget)
		utils.isType(hashtag, 'Hashtag')
		utils.isType(hashtag.unstickHashtag(hashtagIdSticky), true)
		utils.isType(
			await utils.a(() => utils.E(), this.hashtagUpdate(hashtag)),
			true
		)
		return true
		//}}}
	}

	/* A convenient way to unstickHashtag, the target hashtag is just current 
	 * hashtag, internal, use  unstickHashtag to do things */
	async unstickHashtagCurrent(hashtagId: string): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> unstickHashtagCurrent'
		const hashtagIdCurrent = this._getHashtagIdCurrent().get()
		/*istanbul ignore if*/
		if (!hashtagIdCurrent) {
			throw utils.E(ERROR.GENERAL_NOT_FOUND)
		}
		const ok = await utils.a(() => utils.E(), this.unstickHashtag(
			hashtagIdCurrent,
			hashtagId
		))
		log.debug('%s:', label)
		return true
		//}}}
	}

	/*istanbul ignore next: no need to test*/
	async checkHashtagsValidity(): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> checkHashtagsValidity'
		log.debug('%s:', label)
		/* First, load the all notes */
		const hashtags = this._getStateHashtag().getHashtags()
		log.debug('%s:get hashtags:%d', label, hashtags.length)
		for (let hashtag of hashtags) {
			const hashtagChecked = await utils.a(() => utils.E(), hashtag.checkValidity())
			if (hashtagChecked !== hashtag) {
				log.debug('%s:hashtag changed, update to DB', label)
				let ok = await utils.a(() => utils.E(), this.hashtagUpdate(hashtagChecked))
				utils.isType(ok, true)
				/* Because the hashtag is re-loaded, so , if any one changed, then, must need 
				 * to update to redux */
				ok = this._getStateHashtag().saveHashtag(hashtagChecked)
				utils.isType(ok, true)
			}
		}
		return true
		//}}}
	}

	/* 
	 * To add alias to hashtag, need to check the alias name is not existed in 
	 * all the hashtag name and aliases
	 * REVISE: here do not save/update hashtag to db really, the save action 
	 * will be done when user click the 'SAVE' button on hashtag setting dialog
	 */
	async addAlias(
		hashtag: Hashtag,
		aliasName: string
	): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> addAlias'
		log.debug('%s:', label)
		//check
		utils.isTypeInstance(hashtag, Hashtag)
		Hashtag.checkNameFormat(aliasName)
		/*
		 * check if this name is find to add as alias, it should not exist already
		 */
		const hashtagInRedux = this._getStateHashtag().getHashtagByName(aliasName)
		if (hashtagInRedux) {
			throw utils.E(ERROR.HASHTAG_ALIAS_NAME_DUPLICATED)
		}
		const alias = new HashtagAlias()
		alias.setName(aliasName)
		hashtag.addAlias(alias)
		return true
		//}}}
	}

	/* 
	 * To remove the alias from a hashtag, and update the redux for hashtag name
	 * cache 
	 * REVISE: do not save/update hashtag to db here, see above addAlias()
	 */
	async removeAlias(
		hashtag: Hashtag,
		id: string
	): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> removeAlias'
		log.debug('%s:', label)
		//check
		utils.isTypeInstance(hashtag, Hashtag)
		const alias = hashtag.getAlias(id)
		hashtag.removeAlias(id)
		return true
		//}}}
	}

	/* 
	 * To remove a hashtag, it must make sure that there are no notes under 
	 * this hashtag, if there is , throw error
	 *
	 * REVISE: if this hashtag has parents, need to remove it from parents
	 */
	async removeHashtag(hashtagId: string): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> removeHashtag'
		log.debug('%s:', label)
		//check
		Hashtag.checkId(hashtagId)
		//check permission
		if (hashtagId === Hashtag.HASHTAG_ROOT_ID) {
			log.debug('%s:try to delete root tag', label)
			throw utils.E(ERROR.GENERAL_OPERATION_FORBIDDEN)
		}
		//load the hashtag
		let hashtag = this.getHashtagSync(hashtagId)
		/*
		 * REVISE Sat Jun 15 17:46:00 CST 2019
		 * 	Can delete special hashtag, now, I find there are some duplicated 
		 * 	special hashtag, so I need use this api to remove them.
		 */
		//		/*
		//		 * check permission
		//		 */
		//		if(hashtag.isSpecialHashtag()){
		//			log.debug('%s:try to delete special tag', label)
		//			throw utils.E(ERROR.GENERAL_OPERATION_FORBIDDEN)
		//		}
		//TODO no need to load all notes to check, maybe just 1 results is OK
		const notes = await utils.a(/*istanbul ignore next*/() => utils.E(), this._getNoteModel().getNotes(hashtagId))
		if (notes.length !== 0) {
			throw utils.E(ERROR.HASHTAG_DELETE_WITH_NOTES)
		}
		/*
		 * First, set an empty definition of this hashtag and update, this is to
		 * remove all the parent hashtag to remove me
		 */
		const hashtagToUpdate = hashtag.cloneHashtag()
		//set definition
		hashtagToUpdate.setDefinition(new Note())
		//update
		utils.isType(
			await utils.a(() => utils.E(), this.updateHashtagComplex(
				hashtag,
				hashtagToUpdate,
				{
					isTest: false,
				}
			)),
			{ result: true }
		)
		/*
		 * After update, need to re-load it from redux, cuz the rev is changed
		 */
		hashtag = this.getHashtagSync(hashtagId)
		utils.isType(
			await utils.a(/*istanbul ignore next*/() => utils.E(), this._getDBNote().removeHashtag(hashtag)),
			true
		)
		//To remove the data in cache of redux
		utils.isType(
			this._getStateHashtag().removeHashtagById(hashtagId),
			true
		)
		utils.isType(
			this._getStateHashtag().removeHashtagByName(hashtag.name),
			true
		)
		/*
		 * if CURRENT hashtag is this tag, then change it to root
		 */
		if (this._getHashtagIdCurrent().get() === hashtagId) {
			/*
			 * load document
			 */
			utils.isType(
				await utils.a(/*istanbul ignore next*/() => utils.E(), this._getNoteModel().loadDocument(Hashtag.HASHTAG_ROOT_ID)),
				true
			)
			//check the data
			utils.isType(
				await utils.a(() => utils.E(), this._getNavigatorModel().checkNavigator()),
				'boolean'
			)
		}
		//TODO maybe here should remove all the alias name in hashtagsByName in redux?
		return true
		//}}}
	}

	/* 
	 * The breadcrumbs is the path from root to the given hashtag, 
	 * for the hashtag it is not on the mindmap, then it just has a
	 * parent: the root
	 */
	getBreadcrumbs(hashtagId: string): Array<string> {
		//{{{
		const label = 'HashtagModel -> getBreadcrumbs'
		log.debug('%s:', label)
		//check
		Hashtag.checkId(hashtagId)
		const result = [hashtagId]
		const hashtag = this.getHashtagSync(hashtagId)
		if (hashtagId === Hashtag.HASHTAG_ROOT_ID) {
			/*
			 * If current is root tag, then, the breadcrumb is empty,
			 * no need to add the duplicated root hashtag here
			 */
		} else if (hashtag.getParents().length === 0) {
			log.trace('%s:has no parent, just add root', label)
			result.unshift(Hashtag.HASHTAG_ROOT_ID)
		} else {
			let i = 0
			let hashtagCurrent = hashtag
			for (; i < 100; i++) {
				const parents = hashtagCurrent.getParents()
				if (parents.length > 0) {
					const parent = parents[0]
					result.unshift(parent)
					hashtagCurrent = this.getHashtagSync(parent)
				} else {
					break
				}
			}
			/* May be the parent tree do not point to root */
			if (result[0] !== Hashtag.HASHTAG_ROOT_ID) {
				result.unshift(Hashtag.HASHTAG_ROOT_ID)
			}
		}
		return result
		//}}}
	}

	/* 
	 * New version of hashtag update, adding original hashtag object as 
	 * parameter,
	 * Cuz need to compare the origin & target hashtag to find out what changed
	 * in some fields, like : the definition, if some hashtag disappear in 
	 * target
	 * hashtag, then need to drop the hashtag which was store in parent hashtag
	 * as a child, from the parent hashtag
	 * REVISE: move the logic of add/delete alias of hashtag to here, so, need
	 * to check which alias was delete, then need to remove it from redux 
	 */
	async updateHashtagComplex(
		origin: Hashtag,
		target: Hashtag,
		options: {
			isTest: boolean,
		} = {
				isTest: true,
			},
	): Promise<{
		/*
		 * true		: the hashtag updated successfully
		 * false		: the hashtag did not updated cuz, maybe this is a test
		 */
		result: boolean,
		//The hashtag which were dropped from definition
		hashtagIdsDefinitionDropped: Array<string>,
		hashtagIdsDefinitionAdded: Array<string>,
		aliasesAdded: Array<HashtagAlias>,
		aliasesDropped: Array<HashtagAlias>,
		//if true, then will re-put all the notes of this hashtag, to re-build
		//index
		needUpdateNotes: boolean,
	}> {
		//{{{
		const label = 'HashtagModel -> updateHashtagComplex'
		log.debug('%s:', label)
		//result
		let result = {}
		/*
		 * Compare the definition change
		 */
		const hashtagIdsDefinitionOrigin = Object.values(
			origin.getDefinition().noteHashtagMap
		).map(noteHashtag => {
			//$FlowFixMe
			return noteHashtag.hashtagId
		})
		const hashtagIdsDefinitionTarget = Object.values(
			target.getDefinition().noteHashtagMap
		).map(noteHashtag => {
			//$FlowFixMe
			return noteHashtag.hashtagId
		})
		//dropped
		result.hashtagIdsDefinitionDropped = hashtagIdsDefinitionOrigin.filter(hashtagId => {
			return hashtagIdsDefinitionTarget.every(hashtagIdTarget => {
				return hashtagIdTarget !== hashtagId
			})
		})
		/*
		 * Get the added definition hashtag ids 
		 */
		result.hashtagIdsDefinitionAdded = hashtagIdsDefinitionTarget.filter(hashtagId => {
			return hashtagIdsDefinitionOrigin.every(hashtagIdOrigin => {
				return hashtagIdOrigin !== hashtagId
			})
		})
		/*
		 * Here to check all the hashtag added as definition, to check if they
		 * can be the parent of this hashtag, the role is: if the current 
		 * hashtag is parent or ancestor of them, then they can't be parent,
		 * otherwise, there will be a circle of definitions
		 */
		this.checkDefinition(result.hashtagIdsDefinitionAdded, origin._id)
		/*
		 * Need update notes or not? If definition added/dropped some hashtag,
		 * then, AND there is note under the hashtag, then, update is needed
		 */
		if (
			result.hashtagIdsDefinitionDropped.length > 0 ||
			result.hashtagIdsDefinitionAdded.length > 0
		) {
			log.debug(
				'%s:some hashtag dropped/added from definition',
				label,
			)
			/*
			 * Is there notes ?
			 * TODO optimize 
			 */
			const notes = await utils.a(() => utils.E(), this._getNoteModel().getNotes(target._id))
			if (notes.length > 0) {
				result.needUpdateNotes = true
			} else {
				log.debug('%s:there is no note, do not update', label)
			}
		} else {
			log.debug(
				'%s:no hashtags dropped',
				label
			)
			result.needUpdateNotes = false
		}
		/*
		 * handle the alias, get alias added/dropped list
		 */
		const aliasOrigin = origin.getAliases()
		log.debug('%s:origin alias:%o', label, aliasOrigin)
		const aliasTarget = target.getAliases()
		log.debug('%s:target alias:%o', label, aliasTarget)
		//BACK is there some problem ? 
		result.aliasesAdded = aliasTarget.filter(alias => {
			return aliasOrigin.every(aliasB => aliasB._id !== alias._id)
		})
		result.aliasesDropped = aliasOrigin.filter(alias => {
			return aliasTarget.every(aliasB => aliasB._id !== alias._id)
		})
		/*
		 * If it is test, just return
		 * If not, update
		 */
		if (options.isTest) {
			log.trace('%s:to test', label)
			//test return false
			result.result = false
		} else {
			log.trace('%s:to update', label)
			/*
			 * Invoke the hashtagUpdate to save hashtag directly
			 */
			utils.isType(
				await utils.a(/*istanbul ignore next*/() => utils.E(), this.hashtagUpdate(target)),
				true
			)
			/*
			 * Parent to remove the child which disappear in the definition
			 */
			log.debug(
				'%s:update hashtag need to remove self from parent:%o',
				label,
				result.hashtagIdsDefinitionDropped
			)
			for (let hashtagId of result.hashtagIdsDefinitionDropped) {
				//get parent object
				const parent = this.getHashtagSync(hashtagId)
				//remove
				const children = parent.getChildren()
				parent.setChildren(children.filter(hashtagId => hashtagId !== target._id))
				//save
				utils.isType(
					await utils.a(() => utils.E(), this.hashtagUpdate(parent)),
					true,
				)
			}
			/*
			 * To remove the dropped aliases in redux
			 */
			for (let alias of result.aliasesDropped) {
				log.trace('%s:to remove alias:%s', label, alias)
				let ok = this._getStateHashtag().removeHashtagByName(alias.getName())
				utils.isType(ok, true)
			}
			/*
			 * Now, think about all of the descendants of modified hashtag, 
			 * check if it is needed to modify the descendants' ancestor,
			 * if the definition has changed (add/drop some parent hashtag)
			 * then it is be sure all of the descendants of the hashtag should
			 * update their ancestor field
			 *
			 * REVISE Mon Jan 28 11:51:01 CST 2019
			 * 	Move these code from: below update notes , to: above it, cuz
			 * 	maybe these code will update the hashtag fields like: ancestor,
			 * 	so, after update hashtag, then, update all the notes, the all
			 * 	notes will refresh its index for hashtag(including ancestors)
			 */
			utils.isType(
				await utils.a(/*istanbul ignore next*/() => utils.E(), this.updateDescendantsAncestor(target._id)),
				true
			)
			/*
			 * To update all notes if need
			 */
			if (result.needUpdateNotes) {
				log.debug('%s:begin update notes', label)
				const notes = await utils.a(
					() => utils.E(),
					this._getNoteModel().getNotes(target._id)
				)
				for (let note of notes) {
					utils.isType(
						await utils.a(/*istanbul ignore next*/() => utils.E(), this._getNoteModel().noteUpdate(note)),
						true
					)
				}
			}
			result.result = true
		}
		log.trace(
			'%s:result,alias,add:%d,drop:%d',
			label,
			result.aliasesAdded.length,
			result.aliasesDropped.length,
		)
		return result
		//}}}
	}

	/*
	 * Go through all the descendants of hashtag, check & update their 
	 * ancestor, this is useful when user change the structure of the mindmap
	 * tree, then maybe some node/hashtag should update their ancestor
	 */
	async updateDescendantsAncestor(hashtagId: string): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> updateDescendantsAncestor'
		log.debug('%s:', label)
		const descendants = this.getDescendants(hashtagId)
		for (let hashtagId of descendants) {
			utils.isType(
				await utils.a(/*istanbul ignore next*/() => utils.E(), this.updateAncestor(hashtagId)),
				true
			)
		}
		return true
		//}}}
	}

	/*
	 * To get all the child and descendants of a hashtag, all the node
	 * under a hashtag, on the mindmap tree
	 */
	getDescendants(hashtagId: string): Array<string> {
		//{{{
		const label = 'HashtagModel -> getDescendants'
		log.debug('%s:', label)
		const result = []
		const getChildren = (hashtagId: string) => {
			const hashtag = this.getHashtagSync(hashtagId)
			for (let childId of hashtag.getChildren()) {
				result.push(childId)
				getChildren(childId)
			}
		}
		getChildren(hashtagId)
		return result
		//}}}
	}

	/*
	 * For a hashtag, go through up to the top hashtag by the parents fields
	 * and collect all the parents as its ancestor, then compare it with the 
	 * hashtag's ancestor field, if its different, then update the hashtag
	 * using new ancestor value
	 */
	async updateAncestor(hashtagId: string): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> updateAncestor'
		log.debug('%s:', label)
		const hashtag = this.getHashtagSync(hashtagId)
		const ancestor = []
		const upToTop = (hashtagId) => {
			const hashtag = this.getHashtagSync(hashtagId)
			for (let parentId of hashtag.getParents()) {
				ancestor.push(parentId)
				//REVISE change to recursive fn to bubble up to the top 
				//to update the parents id
				upToTop(parentId)
			}
		}
		upToTop(hashtagId)
		const isEqual = (a: Array<string>, b: Array<string>): boolean => {
			if (a !== undefined && b === undefined) {
				return false
			} else if (a === undefined && b !== undefined) {
				return false
			} else if (a === undefined && b === undefined) {
				return true
			} else {
				//a,b all are defined
				return a.every(e => b.some(f => f === e)) &&
					b.every(e => a.some(f => f === e))
			}
		}
		if (isEqual(ancestor, hashtag.getAncestor())) {
			log.debug('%s:ancestor is no problem', label)
		} else {
			log.debug('%s:ancestor changed, update', label)
			hashtag.setAncestor(ancestor)
			utils.isType(
				await utils.a(() => utils.E(), this.hashtagUpdate(hashtag)),
				true
			)
		}
		return true
		//}}}
	}

	/*
	 * A easy way to build a hashtag tree/mindmap structure, this is useful
	 * to build data for test
	 * Parameter:
	 * 	tree:
	 * 	{
	 * 		name	: 'tagA',
	 * 		children		: [
	 * 			{
	 * 				name		: 'tagB',
	 * 				children	: []
	 * 			}
	 * 		]
	 * 	}
	 *
	 */
	/*istanbul ignore next: no need to test*/
	async buildHashtagTree(tree: Object): Promise<boolean> {
		//{{{
		const label = 'HashtagModel -> buildHashtagTree'
		log.debug('%s:', label)
		const goThrough = async (hashtagObject, hashtagParent) => {
			const hashtag = new Hashtag(hashtagObject.name)
			//the parent/definition
			if (hashtagParent) {
				const definition = new Note()
				definition.setContent('is a:', hashtagParent)
				hashtag.setDefinition(definition)
			}
			log.debug('%s:to create hashtag:%s', label, hashtag.name)
			utils.isType(
				await utils.a(() => utils.E(), this.createHashtag(hashtag)),
				true
			)
			for (let child of hashtagObject.children) {
				await utils.a(() => utils.E(), goThrough(child, hashtag))
			}
		}
		await utils.a(() => utils.E(), goThrough(tree, undefined))
		return true
		//}}}
	}

	/*
	 * To check if the given hashtags can be parent of another hashtag
	 */
	checkDefinition(parentIds: Array<string>, childId: string): true {
		//{{{
		const label = 'HashtagModel -> checkDefinition'
		log.debug('%s:', label)
		const hashtagIdsViolation = []
		const child = this.getHashtagSync(childId)
		for (let id of parentIds) {
			try {
				const hashtag = this.getHashtagSync(id)
				if (
					hashtag.getAncestor().includes(childId) ||
					//root is always everyone's ancestor
					childId === Hashtag.HASHTAG_ROOT_ID ||
					//tag can not define itself
					childId === hashtag._id
				) {
					hashtagIdsViolation.push(id)
				}
			} catch (e) {
				if (e.message === ERROR.GENERAL_NOT_FOUND) {
					/*
					 * if not found, fine, it will pass
					 */
				} else {
					throw e
				}
			}
		}
		if (hashtagIdsViolation.length > 0) {
			const e = utils.E(ERROR.HASHTAG_DEFINITION_VIOLATION)
			//$FlowFixMe
			e.data = hashtagIdsViolation
			throw e
		}
		return true
		//}}}
	}
}
