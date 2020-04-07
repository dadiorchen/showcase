//@flow
import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Container } from './Container.js'
import { Note } from '../model/Note.js'
import { getStore } from '../model/store.js'
import { Hashtag } from '../model/Hashtag.js'
import { NoteHashtag } from '../model/NoteHashtag.js'
import { ViewerTodo } from '../component/ViewerTodo.js'
import { ViewerPic } from '../component/ViewerPic.js'
import { Position } from '../model/Navigator.js'
import { HashtagTooltip } from '../component/HashtagTooltip.js'
import { HashtagSettingConnected } from '../component/HashtagSetting.js'
import { FactoryTest, Factory } from '../factory.js'
import { HashtagConnected } from '../component/Hashtag.js'
import { utils } from '../utils/Utils.js'
import { Attachment } from '../model/Attachment.js'
import { HashtagSetting as HashtagSettingModel } from '../model/HashtagSetting.js'
import { HashtagAlias } from '../model/HashtagAlias.js'

const log = require('loglevel').getLogger('../stories/hashtag.js')
const stories = storiesOf('Hashtag', module)

/* Hashtag */
{
	//{{{
	class Test extends React.Component<{}, {
		//the hashtags to display
		hashtags: Array<Hashtag>,
	}>{
		constructor(props: any) {
			super(props)
			/*
			 * To build the hashtags
			 */
			const hashtags = []
			Hashtag.COLORS.forEach(color => {
				const hashtag = new Hashtag('Miditag')
				hashtag.color = color
				hashtags.push(hashtag)
			})
			/*
			 * To build hashtag with avatar
			 */
			Hashtag.COLORS.forEach(color => {
				const hashtagAvatar = new Hashtag('Miditag')
				hashtagAvatar.avatar = require('../temp/imageLogo.js').image
				hashtagAvatar.avatarSize = {
					height: 64,
					width: 64,
				}
				hashtagAvatar.displayType = 'text_icon'
				hashtagAvatar.color = color
				hashtags.push(hashtagAvatar)
			})
			/*
			 * Build hashtag which just show avatar ( no text)
			 */
			Hashtag.COLORS.forEach(color => {
				const hashtagAvatar = new Hashtag('Miditag')
				hashtagAvatar.avatar = require('../temp/imageLogo.js').image
				hashtagAvatar.avatarSize = {
					height: 64,
					width: 64,
				}
				hashtagAvatar.displayType = 'icon'
				hashtagAvatar.color = color
				hashtags.push(hashtagAvatar)
			})
			this.state = {
				hashtags,
			}
		}

		render() {
			const { hashtags } = this.state
			const { Hashtag } = require('../component/Hashtag.js')
			const getAvatarModel = () => ({
				getSrc: (a) => a,
			})
			return [
				<div>
					<h3>
						This story show all kinds hashtag in different case,
						with/withgout avatar, in dark/light background.
					</h3>
				</div>,
				<div
					style={{
						width: '100%',
						height: '100vh',
						display: 'flex',
						backgroundColor: 'rgb(54, 57, 62)',
					}}
				>
					<div
						style={{
							width: '50%',
							height: '100vh',
							lineHeight: '18px',
						}}
						className='content-notes-list-note list-one-selected note-editor'
					>
						{hashtags.map(hashtag =>
							[
								//$FlowFixMe
								<Hashtag
									hashtag={hashtag}
									mode='navigator'
									getAvatarModel={getAvatarModel}
								/>,
								<span> </span>,
							]
						)}
					</div>
					<div
						style={{
							width: '50%',
							height: '100vh',
							background: 'white',
							lineHeight: '18px',
						}}
						className='content-notes-list-note list-one-selected note-editor'
					>
						{hashtags.map(hashtag =>
							[
								//$FlowFixMe
								<Hashtag
									hashtag={hashtag}
									mode='navigator'
									isDarkStyle={false}
									getAvatarModel={getAvatarModel}
								/>,
								<span> </span>,
							]
						)}
					</div>
				</div>
			]
		}
	}
	stories.add('Hashtags', () =>
		<Test />
	)
	//}}}
}

/* tag panel */
{
	//{{{
	const hashtags = [new Hashtag('tagA'), new Hashtag('tagB'), new Hashtag('tagC')]
	const store = getStore({}, {
		hashtags,
	})
	const searchHashtag = (keyword: string): Array<Hashtag> => {
		return hashtags.filter(hashtag => {
			if (hashtag.name.indexOf(keyword) >= 0) {
				return true
			} else {
				return false
			}
		})
	}

	const factory = new FactoryTest({ store })

	//$FlowFixMe
	factory.getDBNote = () => ({
		putHashtag: () => Promise.resolve(true),
		getDB: () => ({
		}),
	})

	const { HashtagPanel } = factory.getFactoryComponent()

	const createHashtag = async (hashtag: Hashtag): Promise<boolean> => {
		return true
	}
	stories.add('HashtagPanel', () =>
		<Container
			store={store}
			factory={factory}
		>
			<HashtagPanel
				searchHashtag={searchHashtag}
				createHashtag={createHashtag}
				toSetHashtag={() => log.warn('MOCK')}
				getHashtagsRecentlyCreated={() => hashtags}
			/>
		</Container>
	)
	//}}}
}

/* HashtagPanelLots */
//{{{
{
	const Test = () => {
		const words = require('../temp/words.js').words
		const hashtags = words.map(word => new Hashtag(word))
		const store = getStore({}, {
			hashtags,
		})
		const factory = new FactoryTest({ store })
		const { HashtagPanel } = factory.getFactoryComponent()
		return (
			<Container
				factory={factory}
			>
				<HashtagPanel />
			</Container>
		)
	}
	stories.add('HashtagPanelLogs', () =>
		<Test />
	)
}
//}}}

/* The single hashtag detail in hashtag panel */
{
	//{{{
	class Test extends React.Component<{}, {
		isReady: boolean,
		hashtag: ?Hashtag,
	}>{
		store: any
		factory: any
		constructor(props: any) {
			super(props)
			this.state = {
				isReady: false,
				hashtag: undefined,
			}
		}
		componentDidMount() {
			this.load()
		}

		load = async () => {
			const hashtag = new Hashtag('Test')
			//add some alias/trigger
			hashtag.addTrigger('TriggerA')
			hashtag.addTrigger('TriggerB')
			hashtag.addTrigger('TriggerC')
			{
				const alias = new HashtagAlias()
				alias.setName('AliasA')
				hashtag.addAlias(alias)
			}
			{
				const alias = new HashtagAlias()
				alias.setName('AliasB')
				hashtag.addAlias(alias)
			}
			{
				const alias = new HashtagAlias()
				alias.setName('AliasC')
				hashtag.addAlias(alias)
			}
			const note = new Note()
			note.setContent('This is definition')
			await hashtag.setAvatar(require('../temp/images.js').imageLink, 100, 100)
			hashtag.setDefinition(note)
			this.store = getStore({}, {
				hashtags: [hashtag],
			})
			this.factory = new FactoryTest({ store: this.store })
			this.setState({
				hashtag,
				isReady: true,
			})
		}

		render() {
			if (this.state.isReady) {
				const { HashtagDetail } = this.factory.getFactoryComponent()
				return (
					<Container
						store={this.store}
						factory={this.factory}
					>
						<div className='dark-style main-content-notes'>
							<HashtagDetail
								hashtagId={this.state.hashtag && this.state.hashtag._id}
							/>
						</div>
					</Container>
				)
			} else {
				return <div>loading...</div>
			}
		}
	}
	stories.add('HashtagPanelHashtagDetail', () =>
		<Test />
	)
	//}}}
}


/*
 * Hashtag at breadcrumbs
 */
{
	//{{{
	const Test = () => {
		const { Hashtag: HashtagComponent } = require('../component/Hashtag.js')
		const hashtag = new Hashtag('Midinote')
		const getAvatarModel = () => ({
			getSrc: (a) => a,
		})
		const hashtagAvatar = new Hashtag('Midinote')
		hashtagAvatar.avatar = require('../temp/imageLogo.js').image
		hashtagAvatar.avatarSize = {
			height: 64,
			width: 64,
		}
		hashtagAvatar.displayType = 'text_icon'
		const hashtagAvatarB = new Hashtag('Midinote')
		hashtagAvatarB.avatar = require('../temp/imageLogo.js').image
		hashtagAvatarB.avatarSize = {
			height: 64,
			width: 64,
		}
		hashtagAvatarB.displayType = 'icon'
		return (
			<div
				className='dark-style'
				style={{
					height: 400,
				}}
			>
				<h1
					style={{
						color: 'white',
					}}
				>
					This story is hashtag shown in breadcrumbs on the top of the app
				</h1>
				{/*$FlowFixMe*/}
				<HashtagComponent
					hashtag={hashtag}
					mode='breadcrumbs'
					getAvatarModel={getAvatarModel}
				/>
				{/*$FlowFixMe*/}
				<HashtagComponent
					hashtag={hashtagAvatar}
					mode='breadcrumbs'
					getAvatarModel={getAvatarModel}
				/>
				{/*$FlowFixMe*/}
				<HashtagComponent
					hashtag={hashtagAvatarB}
					mode='breadcrumbs'
					getAvatarModel={getAvatarModel}
				/>
			</div>
		)
	}
	stories.add('HashtagBreadcrumbs', () =>
		<Test />
	)
	//}}}
}

/* hashtag which appearance is icon */
{
	//{{{
	const hashtag = new Hashtag('icon')
	hashtag.avatar = require('../temp/images.js').imageLink
	hashtag.displayType = 'icon'
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtag)
	const store = getStore()
	const factory = new FactoryTest({ store })
	stories.add('HashtagIcon', () =>
		<Container
			store={store}
			factory={factory}
		>
			<div className='dark-style main-content-notes'>
				<HashtagConnected
					hashtag={hashtag}
					noteHashtag={noteHashtag}
				/>
			</div>
		</Container>
	)
	//}}}
}

/* Viewer block, demo the operation of move cursor by keyboard in editor, 
 * and focus on the block viewer of hashtag, and strike enter to create 
 * new line
 * */
{
	//{{{
	const note = new Note()
	const hashtagQuote =
		Hashtag.SPECIAL_HASHTAGS.quote.build()
	const store = getStore({}, {
		hashtags: [
			hashtagQuote,
		],
	})
	const factory = new FactoryTest({ store })
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtagQuote)
	noteHashtag.setData('This is quote content')

	note.setContent(
		'This is a note title\n',
		'this is a line\n',
		noteHashtag,
		'this is a line\n',
	)

	const { NoteEditor } = factory.getFactoryComponent()

	stories.add('ViewerBlock', () =>
		<Container
			store={store}
		>
			<div className='temp-story-container'>
				<NoteEditor
					note={note}
					autoSaverEnabled={false}
				/>
			</div>
		</Container>
	)
	//}}}
}

/* Quote hashtag */
{
	//{{{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.quote.build()
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtag)
	noteHashtag.setData('This is quote, this is quote, this is quote, this is quote, this is quote, this is quote.')
	const store = getStore()
	const factory = new FactoryTest({ store })
	const { ViewerQuote } = factory.getFactoryComponent()
	stories.add('QuoteTextArea', () =>
		<div
			className='temp-story-container'>
			<ViewerQuote
				noteHashtag={noteHashtag}
				readOnly={false}
				value='TEST' />
		</div>
	)
	//}}}
}

/* Code hashtag */
{
	//{{{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.code.build()
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtag)
	noteHashtag.setData(
		`var a = 12
var c = a + 20
`)
	const store = getStore()
	const factory = new FactoryTest({ store })
	const { ViewerCode } = factory.getFactoryComponent()
	stories.add('ViewerCode', () =>
		<div
			className='temp-story-container'>
			<ViewerCode
				noteHashtag={noteHashtag}
				readOnly={false}
			/>
		</div>
	)
	//}}}
}

/* Todo */
{
	//{{{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.todo.build()
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtag)
	noteHashtag.setData(1)

	stories.add('Todo', () =>
		<div className='dark-style main-content-notes' >
			<pre>
				This is content
				{/*$FlowFixMe*/}
				<ViewerTodo
					noteHashtag={noteHashtag}
					noteEditorComponent={undefined}
				>
					{hashtag.getTextDisplay()}
				</ViewerTodo>
				content content
			</pre>
		</div>
	)
	//}}}
}

/* pic */
{
	//{{{
	const Test = () => {
		const factory = new FactoryTest()
		const hashtag = Hashtag.SPECIAL_HASHTAGS.pic.build()
		const noteHashtag = new NoteHashtag()
		noteHashtag.setHashtag(hashtag)
		const note = new Note()
		const attachment = new Attachment(
			note._id,
			utils.convertDataURLToBlob(require('../temp/imageHitler.js').imageHitler),
			'image/jpeg',
		)
		noteHashtag.setData(attachment.getAttachmentRef())
		//mock db
		////$FlowFixMe
		factory.getNoteModel = () => ({
			getAttachment: () => Promise.resolve(attachment.blob),
		})
		//the component
		const { ViewerPic } = factory.getFactoryComponent()
		return (
			<Container
				factory={factory}
			>
				<div className='temp-story-container'>
					<ViewerPic
						noteHashtag={noteHashtag}
					/>
				</div>
			</Container>
		)
	}
	stories.add('Pic', () =>
		<Test />
	)
	//}}}
}

/* pic max */
//{{{
{
	const { Max } = require('../component/ViewerPic.js')
	//mock
	const factoryComponent: any = {
		AttachmentPicture: () => <img
			src={require('../temp/imageHitler.js').imageHitler}
		/>,
	}
	const Test = () => {
		return (//$FlowFixMe
			<Max
				factoryComponent={factoryComponent}
				onClose={() => log.debug('CLOSE')}
			/>
		)
	}
	stories.add('PicMax', () =>
		<Test />
	)
}
//}}}


/* pic big */
{
	//{{{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.pic.build()
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtag)
	noteHashtag.setData(require('../temp/imageGit.js').image)
	stories.add('PicBig', () =>
		<div className='temp-story-container'>
			{/*$FlowFixMe*/}
			<ViewerPic
				noteHashtag={noteHashtag}
			/>
		</div>
	)
	//}}}
}

/* attachment picture */
{
	//{{{
	const Test = () => {
		const store = getStore()
		const factory = new FactoryTest({})
		//$FlowFixMe
		factory.getNoteModel = () => ({
			getAttachment: () => new Promise(resolve => {
				setTimeout(() => {
					resolve(utils.convertDataURLToBlob(require('../temp/imageGit.js').image))
				}, 2000)
			}),
		})
		const { AttachmentPicture } = factory.getFactoryComponent()

		return (
			<Container
				factory={factory}
			>
				<div className='temp-story-container'>
					<div className='note-detail-image'>
						<AttachmentPicture
							attachmentRef={'attachment:n-64f33694-bac3-11e8-a221-1fee1d475729/a-64f33694-bac3-11e8-a221-1fee1d475729'}
						/>
					</div>
				</div>
			</Container>
		)
	}
	stories.add('AttachmentPicture', () =>
		<Test />
	)
	//}}}
}

/* pic load on scroll */
{
	//{{{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.pic.build()
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtag)
	noteHashtag.setData(require('../temp/imageHitler.js').imageHitler)
	stories.add('PicLoadOnScroll', () =>
		<div className='temp-story-container'>
			{/*$FlowFixMe*/}
			<ViewerPic
				noteHashtag={noteHashtag}
			/>
		</div>
	)
	//
	//}}}
}

/* Hashtag out of note , just for show, like in the navigator */
{
	//{{{
	const hashtag = new Hashtag('tag')
	const store = getStore()
	const factory = new FactoryTest({ store })
	const { Hashtag: HashtagComponent } = factory.getFactoryComponent()
	const MyTest = (props) => {
		return (
			<HashtagComponent
				mode='navigator'
				hashtag={hashtag}
			/>
		)
	}
	stories.add('HashtagInNavigator', () =>
		<Container
			store={store}
			factory={factory}
		>
			<div className='dark-style main-content-notes'>
				<MyTest />
			</div>
		</Container>
	)
	//}}}
}

/* hash */
{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.hash.build()

	const store = getStore()
	const factory = new FactoryTest({ store })
	const { Hashtag: HashtagComponent } = factory.getFactoryComponent()
	//{{{
	stories.add('Hash', () =>
		<Container
			store={store}
			factory={factory}
		>
			<div className='dark-style main-content-notes' >
				<HashtagComponent
					mode='navigator'
					hashtag={hashtag}
				/>
			</div>
		</Container>
	)
	//}}}
}


/* midilink */
{
	//{{{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.Midilink.build()
	const store = getStore()
	const factory = new FactoryTest({ store })
	const { Hashtag: HashtagComponent } = factory.getFactoryComponent()
	stories.add('Midilink', () =>
		<Container
			store={store}
			factory={factory}
		>
			<div className='dark-style main-content-notes'>
				<HashtagComponent
					mode='navigator'
					hashtag={hashtag}
				/>
			</div>
		</Container>
	)
	//}}}
}

/* link view 
 * the line in note, but in the view mode
 * */
{
	//{{{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.Midilink.build()
	const hashtagTarget = new Hashtag('Somewhere')
	const position = Position.buildByHashtagId(hashtagTarget._id)
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtag)
	noteHashtag.setData([position.format(), 'AutoComplete'])
	const store = getStore()
	const factory = new FactoryTest({ store })
	const { Hashtag: HashtagComponent } = factory.getFactoryComponent()
	stories.add('MidilinkView', () =>
		<Container
			store={store}
			factory={factory}
		>
			<div className='dark-style main-content-notes'>
				<HashtagComponent
					mode='view'
					hashtag={hashtag}
					noteHashtag={noteHashtag}
				/>
			</div>
		</Container>
	)
	//}}}
}

/* link edit*/
//TODO temp close
if (false) {
	//{{{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.Midilink.build()
	const hashtagTarget = new Hashtag('Somewhere')
	const position = Position.buildByHashtagId(hashtagTarget._id)
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtag)
	noteHashtag.setData([position.format(), 'AutoComplete'])
	const note = new Note()
	note.setContent('test', noteHashtag)
	noteHashtag.setNote(note)
	const text = hashtag.getTextDisplay(noteHashtag.data).replace(/\s/g, '&nbsp;')
	const factoryMock = {
		getNavigatorModel: () => ({
			visitHashtagCurrentAnchorNoteId: () => { },
			visitHashtag: () => { },
			save: () => Promise.resolve(true),
		}),
		getNoteModel: () => ({
			loadDocument: () => Promise.resolve(true),
		}),
	}
	const store = getStore()
	const factory = new FactoryTest({ store })
	const { Hashtag: HashtagComponent } = factory.getFactoryComponent()
	stories.add('MidilinkEdit', () =>
		<Container
			factory={factory}
			store={store}
		>
			<div className='dark-style main-content-notes'>
				<HashtagComponent
					mode='editor'
					hashtag={hashtag}
					noteHashtag={noteHashtag}
					note={note}
				>
					<span dangerouslySetInnerHTML={{ __html: text }}></span>
				</HashtagComponent>
			</div>
		</Container>
	)
	//}}}
}

/* link edit empty
 * this means: the first time the tag insert into to the note,
 * the tag not set url data yet, so , need to pop up the 
 * value setting dialog to set the value
 * */
{
	//{{{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.Midilink.build()
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtag)
	const note = new Note()
	note.setContent('test', noteHashtag)
	noteHashtag.setNote(note)
	const factoryMock = {
		getNavigatorModel: () => ({
			visitHashtagCurrentAnchorNoteId: () => { },
			visitHashtag: () => { },
			save: () => Promise.resolve(true),
		}),
		getNoteModel: () => ({
			loadDocument: () => Promise.resolve(true),
		}),
	}
	const hashtagA = new Hashtag('hashtagA')
	const hashtagB = new Hashtag('hashtagB')
	const store = getStore({
		hashtagByIds: {
			[hashtagA._id]: hashtagA,
			[hashtagB._id]: hashtagB,
		},
	})
	const factory = new FactoryTest({ store })
	const { Hashtag: HashtagComponent, HashtagDataSetting } = factory.getFactoryComponent()
	class Test extends React.Component<{}, {}>{
		constructor(props) {
			super(props)
		}

		refresh() {
			//{{{
			const label = 'Test.refresh'
			this.forceUpdate()
			log.debug('%s:', label)
			//}}}
		}

		render() {
			const label = 'Test.render'
			log.debug('%s:', label)
			const text = hashtag.getTextDisplay(noteHashtag.data).replace(/\s/g, '&nbsp;')
			return (
				<HashtagComponent
					mode='editor'
					hashtag={hashtag}
					noteHashtag={noteHashtag}
					note={note}
					noteEditorComponent={this}
				>
				</HashtagComponent>
			)
		}
	}

	stories.add('MidklinkEditEmpty', () =>
		<Container
			store={store}
			factory={factory}
		>
			<div className='dark-style main-content-notes'>
				<Test />
				<HashtagDataSetting />
			</div>
		</Container>
	)
	//}}}
}



/* 
 * empty link 
 */
{
	//{{{
	const hashtag = Hashtag.SPECIAL_HASHTAGS.link.build()
	const noteHashtag = new NoteHashtag()
	noteHashtag.setHashtag(hashtag)
	const note = new Note()
	note.setContent('test', noteHashtag)
	noteHashtag.setNote(note)
	const factoryMock = {
		getNavigatorModel: () => ({
			visitHashtagCurrentAnchorNoteId: () => { },
			visitHashtag: () => { },
			save: () => Promise.resolve(true),
		}),
		getNoteModel: () => ({
			loadDocument: () => Promise.resolve(true),
		}),
	}
	const hashtagA = new Hashtag('hashtagA')
	const hashtagB = new Hashtag('hashtagB')
	const store = getStore({
		hashtagByIds: {
			[hashtagA._id]: hashtagA,
			[hashtagB._id]: hashtagB,
		},
	})
	const factory = new FactoryTest({ store })
	const { Hashtag: HashtagComponent, HashtagDataSetting } = factory.getFactoryComponent()
	class Test extends React.Component<{}, {}>{
		constructor(props) {
			super(props)
		}

		refresh() {
			//{{{
			const label = 'Test.refresh'
			this.forceUpdate()
			log.debug('%s:', label)
			//}}}
		}

		render() {
			const label = 'Test.render'
			log.debug('%s:', label)
			const text = hashtag.getTextDisplay(noteHashtag.data).replace(/\s/g, '&nbsp;')
			return (
				<HashtagComponent
					mode='editor'
					hashtag={hashtag}
					noteHashtag={noteHashtag}
					note={note}
					noteEditorComponent={this}
				>
				</HashtagComponent>
			)
		}
	}

	stories.add('LinkEditEmpty', () =>
		<Container
			store={store}
			factory={factory}
		>
			<div className='dark-style main-content-notes'>
				<Test />
				<HashtagDataSetting />
			</div>
		</Container>
	)
	//}}}
}

/*
 * To test link hashtag
 */
{
	const Test = () => {
		const hashtagLink = Hashtag.SPECIAL_HASHTAGS.link.build()
		const noteHashtag = new NoteHashtag()
		noteHashtag.setHashtag(hashtagLink)
		const store = getStore({}, {
			hashtagLink
		})
		const factory = new FactoryTest({ store })
		const { Hashtag: HashtagComponent } = factory.getFactoryComponent()
		return (
			<Container
				factory={factory}
			>
				{/*add mode: to pop up dialog to set link data*/}
				<HashtagComponent
					mode='add'
					hashtag={hashtagLink}
					noteHashtag={noteHashtag}
				/>
			</Container>
		)
	}
	stories.add('link', () =>
		<Test />
	)
}

/*
 * To test hashtag data setting dialog
 * The hashtag is link
 */
{
	//{{{
	const Test = () => {
		const factory = new FactoryTest()
		const { HashtagDataSetting } = factory.getFactoryComponent()
		const hashtagLink = Hashtag.SPECIAL_HASHTAGS.link.build()
		const noteHashtag = new NoteHashtag()
		noteHashtag.setHashtag(hashtagLink)
		return (
			<Container
				factory={factory}
			>
				<HashtagDataSetting
					noteHashtag={noteHashtag}
					onCancel={() => log.warn('mock canced')}
					onSaved={() => log.warn('mock saved')}
				/>
			</Container>
		)
	}
	stories.add('HashtagDataSetting', () =>
		<Test />
	)
	//}}}
}

///* input position */
//{
//	const hashtagA		= new Hashtag('hashtagA')
//	const hashtagB		= new Hashtag('hashtagB')
//	const position		= Position.buildByHashtagId(hashtagA._id)
//
//	const hashtagByIds	= {
//		[hashtagA._id]		: hashtagA,
//		[hashtagB._id]		: hashtagB,
//	}
//	//{{{
//	stories.add('InputPosition',() =>
//		<InputPosition 
//			value={position.format()}
//			hashtagByIds={hashtagByIds}
//			updateValue={() => {}}
//		/>
//	)
//	//}}}
//}

/* HashtagSetting */
{
	//{{{
	const Test = () => {
		const hashtag = new Hashtag('dean')
		const store = getStore({}, {
			hashtags: [hashtag],
		})
		const factory = new FactoryTest({ store })
		//$FlowFixMe
		factory.getDBNote = () => ({
			getNotes: () => Promise.resolve([new Note()]),
			putHashtag: async () => {
				await utils.sleep(4000)
				return true
			},
		})
		const hashtagModel = factory.getHashtagModel()
		const { HashtagSetting } = factory.getFactoryComponent()
		return (
			<Container
				factory={factory}
			>
				<div className='dark-style main-content-notes' >
					<button
						onClick={() => factory.getHashtagSetting().dispatch.fire(
							HashtagSettingModel.EVENTS.toOpen.name,
							new HashtagSettingModel.EVENTS.toOpen.eventType(
								hashtag._id
							))}
					>SET</button>
					<HashtagSetting />
				</div>
			</Container>
		)
	}

	stories.add('HashtagSetting', () =>
		<Test />
	)
	//}}}
}

/* HashtagNameSetting */
{
	//{{{
	const factoryMock = {
		components: {
			Hashtag: (props) => <div>{props.hashtagId}</div>,
		}
	}

	const Test = () => {
		const hashtags = [new Hashtag('tagA'), new Hashtag('tagB'), new Hashtag('tagC')]
		const store = getStore({
			setting: {
				spellCheck: true,
			}
		}, {
			hashtags,
		})
		const factory = new FactoryTest({ store })
		log.warn('the store:', factory.getStore().getState())
		const searchHashtag = (keyword: string): Array<Hashtag> => {
			return hashtags.filter(hashtag => {
				if (hashtag.name.indexOf(keyword) >= 0) {
					return true
				} else {
					return false
				}
			})
		}
		const { HashtagNameSetting } = factory.getFactoryComponent()
		return (
			<div className='tag-setting-dialog-wrapper position-relative' >
				<Container
					factory={factory}
				>
					<HashtagNameSetting
						name='oldName'
						onOK={(name) => log.debug('to change hashtag name:', name)}
						onBack={() => log.debug('MOCK on back')}
						searchHashtag={searchHashtag}
					/>
				</Container>
			</div>
		)
	}
	stories.add('HashtagSettingName', () =>
		<Test />
	)
	//}}}
}

/* HashtagSettingTrigger */
{
	//{{{
	const Test = () => {
		const hashtag = new Hashtag('tag')
		hashtag.addTrigger('triggerA')
		hashtag.addTrigger('triggerB')
		const { HashtagTriggerSetting } = require('../component/HashtagSetting.js')
		return (
			<div className='tag-setting-dialog-wrapper position-relative' >
				{/*$FlowFixMe*/}
				<HashtagTriggerSetting
					spellCheck={false}
					hashtag={hashtag}
					onBack={() => { }}
				/>
			</div>
		)
	}
	stories.add('HashtagSettingTrigger', () =>
		<Test />
	)
	//}}}
}

/* HashtagSettingAlias */
{
	//{{{
	const Test = () => {
		const hashtag = new Hashtag('tag')
		const store = getStore({}, {
			hashtags: [hashtag],
		})
		const factory = new FactoryTest({ store })
		const { HashtagAliasSetting } = factory.getFactoryComponent()
		return (
			<Container
				factory={factory}
			>
				<div className='tag-setting-dialog-wrapper position-relative' >
					<HashtagAliasSetting
						hashtag={hashtag}
					/>
				</div>
			</Container>
		)
	}

	stories.add('hashtagSettingAlias', () =>
		<Test />
	)
	//}}}
}

/* HashtagSettingAvatarDialog */
{
	//{{{
	const Test = () => {
		const AvatarDialog = require('../component/HashtagSetting.js').AvatarDialogConnected

		return (
			<Container>
				<div className='tag-setting-dialog-wrapper position-relative'>
					<AvatarDialog />
				</div>
			</Container>
		)
	}
	stories.add('HashtagSettingAvatarDialog', () =>
		<Test />
	)
	//}}}
}

/* HashtagSettingMergeDialog */
//{{{
{
	const Test = () => {
		const hashtag = new Hashtag('ToBeMerge')
		const hashtagB = new Hashtag('ToMerge')
		const store = getStore({}, {
			hashtags: [hashtag, hashtagB]
		})
		const factory = new FactoryTest({ store })
		//$FlowFixMe
		factory.getHashtagSetting = () => ({
			merge: () => Promise.resolve({ result: true }),
		})
		const { MergeDialogConnected } = require('../component/HashtagSetting.js')
		return (
			<Container
				factory={factory}
			>
				<MergeDialogConnected
					hashtagId={hashtag._id}
				/>
			</Container>
		)
	}
	stories.add('HashtagSettingMergeDialog', () =>
		<div className='tag-setting-dialog-wrapper position-relative'>
			<Test />
		</div>
	)
}
//}}}

/* Definition editor */
/* the component to input tag definition , the editor
 * is similar to the note editor */
{
	//{{{
	const hashtag = new Hashtag('tag')
	const note = new Note()
	note.setContent('test definition')
	const store = getStore({}, {
		hashtags: [hashtag, new Hashtag('tagT')]
	})
	hashtag.setDefinition(note)
	const factory = new FactoryTest({ store })
	const { DefinitionEditor, AutoComplete } = factory.getFactoryComponent()

	class Test extends React.Component<{}, {
		definition: Note,
	}>{
		ref: any
		constructor(props) {
			super(props)
			this.state = {
				definition: hashtag.getDefinition(),
			}
		}

		render() {
			return (
				<div>
					<DefinitionEditor
						ref={r => this.ref = r}
						note={hashtag.getDefinition()}
						autoCompleteEnabled={true}
						modifyNote={() => { }}
					/>
					<AutoComplete />
					<button
						onClick={() => {
							log.debug(
								'The definition:',
								this.ref.getWrappedInstance().getNote()
							)
						}}
					>DEBUG</button>
				</div>
			)
		}
	}

	stories.add('DefinitionEditor', () =>
		<Container
			store={store}
			factory={factory}
		>
			<div className='dark-style main-content-notes' >
				<Test />
			</div>
		</Container>
	)

	//}}}
}

/* Definition viewer */
{
	//{{{
	const hashtag = new Hashtag('tag')
	const note = new Note()
	const hashtagA = new Hashtag('tagA')
	note.setContent('This is a tag of:', hashtagA)
	hashtag.setDefinition(note)
	const store = getStore({
		hashtagByIds: {
			[hashtagA._id]: hashtagA,
			[hashtag._id]: hashtag,
		}
	})
	const factory = new FactoryTest({ store })
	const { DefinitionViewer } = factory.getFactoryComponent()
	stories.add('DefinitionViewer', () =>
		<Container
			store={store}
		>
			<div className='dark-style main-content-notes'>
				<DefinitionViewer
					note={hashtag.getDefinition()}
				/>
			</div>
		</Container>
	)
	//}}}
}

/* Definition summery */
{
	//{{{
	const hashtag = new Hashtag('tag')
	const note = new Note()
	const hashtagA = new Hashtag('tagA')
	note.setContent('This is a tag of:', hashtagA)
	hashtag.setDefinition(note)
	const store = getStore({}, {
		hashtags: [hashtag, hashtagA],
	})
	const factory = new FactoryTest({ store })
	const { DefinitionSummary } = factory.getFactoryComponent()
	stories.add('DefinitionSummery', () =>
		<Container
			factory={factory}
		>
			<DefinitionSummary
				hashtagId={hashtag._id}
			/>
		</Container>
	)

	//}}}
}

/* doc hashtag */
{
	//{{{
	const Test = () => {
		const hashtag = Hashtag.SPECIAL_HASHTAGS.doc.build()
		const noteHashtag = new NoteHashtag()
		noteHashtag.setHashtag(hashtag)
		const HTML =
			//{{{
			`<div data-contents="true"><h1 class="rdw-start-aligned-block" data-block="true" data-editor="cv8oi" data-offset-key="8d521-0-0"><div data-offset-key="8d521-0-0" class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr"><span data-offset-key="8d521-0-0" style="color: rgb(36, 41, 46); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;;"><span data-text="true">Asynchronous Transitions</span></span></div></h1><div class="" data-block="true" data-editor="cv8oi" data-offset-key="1hmnd-0-0"><div data-offset-key="1hmnd-0-0" class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr"><span data-offset-key="1hmnd-0-0" style="color: rgb(36, 41, 46); background-color: rgb(255, 255, 255); font-size: 16px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;;"><span data-text="true">Sometimes, you need to execute some asynchronous code during a state transition and ensure the new state is not entered until your code has completed. A good example of this is when you transition out of a state and want to gradually fade a UI component away, or slide it off the screen, and don't want to transition to the next state until after that animation has completed.</span></span></div></div></div>`
		//}}}
		/*
		 * To mock the data of document content
		 */
		const factory = new FactoryTest()
		factory.getHashtagDocumentModel().setNoteHashtagData(noteHashtag, HTML)
		log.debug('the summary:%s',
			factory.getHashtagDocumentModel().getSummary(noteHashtag)
		)
		const { ViewerDoc } = factory.getFactoryComponent()
		return (
			<Container
				factory={factory}
			>
				<div
					className='temp-story-container'>
					<ViewerDoc
						noteHashtag={noteHashtag}
					/>
				</div>
			</Container>
		)
	}
	stories.add('ViewerDoc', () =>
		<Test />
	)
	//}}}
}

/* doc editor */
{
	//{{{
	const Test = () => {
		const note = new Note()
		const tomato = new Hashtag('tomato')
		note.setContent('How to use Pomodoro technique?', tomato)
		const noteHashtag = new NoteHashtag()
		noteHashtag.setNote(note)
		const store = getStore({}, {
			hashtags: [tomato],
			notes: [note],
		})
		const factory = new FactoryTest({ store })
		//$FlowFixMe
		factory.getNoteModel().noteUpdate = () => Promise.resolve(true)
		//The HTML content to set to document
		const HTML =
			//{{{
			`<div data-contents="true"><h1 class="rdw-start-aligned-block" data-block="true" data-editor="cv8oi" data-offset-key="8d521-0-0"><div data-offset-key="8d521-0-0" class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr"><span data-offset-key="8d521-0-0" style="color: rgb(36, 41, 46); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;;"><span data-text="true">Asynchronous Transitions</span></span></div></h1><div class="" data-block="true" data-editor="cv8oi" data-offset-key="1hmnd-0-0"><div data-offset-key="1hmnd-0-0" class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr"><span data-offset-key="1hmnd-0-0" style="color: rgb(36, 41, 46); background-color: rgb(255, 255, 255); font-size: 16px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;;"><span data-text="true">Sometimes, you need to execute some asynchronous code during a state transition and ensure the new state is not entered until your code has completed. A good example of this is when you transition out of a state and want to gradually fade a UI component away, or slide it off the screen, and don't want to transition to the next state until after that animation has completed.</span></span></div></div></div>`
		//}}}
		factory.getHashtagDocumentModel().setNoteHashtagData(noteHashtag, HTML)
		/*
		 * mock the load attachment fn
		 */
		const getAttachmentOriginal = factory.getNoteModel().getAttachment.bind(factory.getNoteModel())
		//$FlowFixMe
		factory.getNoteModel().getAttachment = async (...argument) => {
			await utils.sleep(6000)
			return getAttachmentOriginal(...argument)
		}
		const { ViewerDocEditor } = factory.getFactoryComponent()
		return (
			<Container
				factory={factory}
			>
				<div
					style={{
						fontSize: 14,
					}}
				>
					<ViewerDocEditor
						noteHashtag={noteHashtag}
					/>
				</div>
			</Container>
		)
	}

	stories.add('HashtagDocEditor', () =>
		<Test />
	)
	//}}}
}

/*
 * Avatar thumb
 */
{
	//{{{
	class Test extends React.Component<{}, {
		images: Array<string>,
		thumbs: Array<string>,
	}>{
		constructor(props) {
			super(props)
			const images = []
			images.push(require('../temp/imageHitler.js').imageHitler)
			images.push(require('../temp/imageBig.js').image)
			images.push(require('../temp/imageBili.js').image)
			images.push(require('../temp/imageTall.js').image)
			images.push(require('../temp/imageLogo.js').image)
			this.state = {
				images,
				thumbs: [],
			}
		}

		componentDidMount() {
			this.loadThumb()
		}

		loadThumb = async () => {
			/*
			 * To gen thumb
			 */
			let thumbs = []
			const { AvatarModel } = require('../model/AvatarModel.js')
			const avatarModel = new AvatarModel()
			for (let i = 0; i < this.state.images.length; i++) {
				const image = this.state.images[i]
				const thumb = await avatarModel.genAvatarThumb(image)
				thumbs.push(thumb)
			}
			this.setState({ thumbs })
		}

		render() {
			return (
				<div>
					<h1>This story show the fn of genAvatarThumb, in
					various cases</h1>
					<h2>The original image</h2>
					{this.state.images.map(image =>
						<img src={image} />
					)}
					<h2>The thumbs</h2>
					{this.state.thumbs.map(thumb =>
						<img src={thumb} />
					)}
				</div>
			)
		}
	}

	stories.add('AvatarThumb', () =>
		<Test />
	)
	//}}}
}
