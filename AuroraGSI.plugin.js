//META{"name":"AuroraGSI"}*//

class AuroraGSI {
	
    getName() { return "AuroraGSI"; }
    getDescription() { return "Sends information to Aurora about users connecting to/disconnecting from, mute/deafen status"; }
    getVersion() { return "1.0.1"; }
	getAuthor() { return "Popato"; }
	getChanges() {
		return {
            "1.0.0" : 
            `
                Initial version.
            `,
            "1.0.1" :
            `
                Added conditions for only reacting to local user.
            `
		};
    }
    
    constructor(){
        this.json = {
            "provider": {
                "name": "discord",
                "appid": -1
            },
            "user":{
                "id": -1,
                "status": "undefined",
                "self_mute": false,
                "self_deafen" : false,
                "mentions": false,
                "unread_messages": false,
                "being_called": false
            },
            "guild": {
                "id": -1,
                "name": "",
            },
            "text": {
                "id": -1,
                "type": -1,
                "name": "",
            },
            "voice": {
                "id": -1,
                "type": -1,
                "name": "",      
            }
        }
    }

    load() {}//legacy

    start() {
        let libLoadedEvent = () => {
            try{ this.onLibLoaded(); }
            catch(err) { console.error(this.getName(), "fatal error, plugin could not be started!", err); }
        };

		let lib = document.getElementById("NeatoBurritoLibrary");
		if(lib == undefined) {
			lib = document.createElement("script");
			lib.setAttribute("id", "NeatoBurritoLibrary");
			lib.setAttribute("type", "text/javascript");
			lib.setAttribute("src", "https://rawgit.com/Metalloriff/BetterDiscordPlugins/master/Lib/NeatoBurritoLibrary.js");
			document.head.appendChild(lib);
		}
        if(typeof window.Metalloriff !== "undefined") libLoadedEvent();
        else lib.addEventListener("load", libLoadedEvent);
    }
    
    stop() {
        clearInterval(this.jsonTimer);
        clearInterval(this.updatetimer);
        this.ready = false;
    }
    
	onLibLoaded() {
        
        this.settings = NeatoLib.Settings.load(this, this.defaultSettings);

        NeatoLib.Updates.check(this);

        if(this.settings.displayUpdateNotes) NeatoLib.Changelog.compareVersions(this.getName(), this.getChanges());

        let getVoiceStates = NeatoLib.Modules.get(["getVoiceState"]).getVoiceStates,
            getUser = NeatoLib.Modules.get(["getUser"]).getUser,
            getChannel = NeatoLib.Modules.get(["getChannel"]).getChannel;

        this.jsonTimer = setInterval( this.sendJsonToAurora, 50, this.json );

        this.updatetimer = setInterval(() => { 
            var self = this;
			
            var guild = NeatoLib.getSelectedGuild();
            var localUser = NeatoLib.getLocalUser();
            var localStatus = NeatoLib.getLocalStatus();
            var textChannel = NeatoLib.getSelectedTextChannel();
            var voiceChannel = NeatoLib.getSelectedVoiceChannel();
			if (voiceChannel)
				var voiceStates = getVoiceStates(voiceChannel.guild_id);
            
            if(localUser && localStatus){
                self.json.user.id = localUser.id;
                self.json.user.status = localStatus;
            }
            else {
                self.json.user.id = 0;
                self.json.user.status = "";
            }

            if(guild) {
                self.json.guild.id = guild.id;
                self.json.guild.name = guild.name;
            }
            else {
                self.json.guild.id = 0;
                self.json.guild.name = "";
            }

            if(textChannel){
                self.json.text.id = textChannel.id;
                if(textChannel.type === 0){//text channel
                    self.json.text.type = 0;
                    self.json.text.name = textChannel.name;
                }
                else if (textChannel.type === 1){//pm
                    self.json.text.type = 1;
                    self.json.text.name = getUser(textChannel.recipients[0]).username;
                }
                else if (textChannel.type === 3){//group pm
                    self.json.text.type = 3;
                    if(textChannel.name)
                        self.json.text.name = textChannel.name;
                    else{
                        let newname = "";
                        for(let i = 0; i< textChannel.recipients.length; i++){
                            let user = textChannel.recipients[i];
                            newname += getUser(user).username + " ";
                        }
                        self.json.text.name = newname;
                    }
                }
            }
            else
            {
                self.json.text.id = 0;
                self.json.text.type = "";
                self.json.text.name = "";
            }

            if(voiceChannel){
                if(voiceChannel.type === 1){//call
                    self.json.voice.type = 1;
                    self.json.voice.id = voiceChannel.id;
                    self.json.voice.name = getUser(voiceChannel.recipients[0]).username;
                }
                else if(voiceChannel.type === 2) {//voice channel
                    self.json.voice.type = 2;
                    self.json.voice.id = voiceChannel.id;
                    self.json.voice.name = voiceChannel.name;
                }
            }
            else{
                self.json.voice.id = 0;
                self.json.voice.type = -1;    
                self.json.voice.name = "";
            }

            if(voiceStates){
                let userVoiceState = voiceStates[localUser.id];
                if(userVoiceState){
                    self.json.user.self_mute = userVoiceState.selfMute;
                    self.json.user.self_deafen = userVoiceState.selfDeaf;
                }        
            }
			
			self.json.user.being_called = false;
			self.json.user.unread_messages = false;
			self.json.user.mentions = false;
			
			this.unpatch = NeatoLib.monkeyPatchInternal(NeatoLib.Modules.get("isMentioned"), "isMentioned", e => {
				if (e.args[0].call != null) {
					self.json.user.being_called = true;
				}
			});
			
			if (document.querySelector('[class^="numberBadge-"]'))
				self.json.user.mentions = true;
			if (document.getElementsByClassName("bd-unread").length > 0)
				self.json.user.unread_messages = true;
			
        }, 100);
		
        NeatoLib.Events.onPluginLoaded(this);
    }

    sendJsonToAurora(json) {
        fetch('http://localhost:9088/', {
            method: 'POST',
            body: JSON.stringify(json),
            mode:'no-cors',
            headers:{
                'Content-Type': 'application/json'
            }
        });
    }
}