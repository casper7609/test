var openGames = "Async_LFG_Queue"; // put new and partial games here
var fullGames = "Async_IP_Queue"; // put full and complete games here

handlers.CloudLoot = function (args) {
    var killedNpc = args.KilledNpc;
    var characterId = args.CharacterId;
    var catalogVersion = args.CatalogVersion;

    var catalogItems = server.GetCatalogItems({
        "CatalogVersion" : catalogVersion
    });

    var entityFound = false;
    var minGold = 0;
    var maxGold = 0;
    var gold = 0;
    for (var i = 0; i < catalogItems.Catalog.length; i++)
    {
        var item = catalogItems.Catalog[i];
        if (item.ItemId == killedNpc)
        {
            var customData = JSON.parse(item.CustomData);
            minGold = parseInt(customData.MinGold);
            maxGold = parseInt(customData.MaxGold);
            gold = rand(minGold, maxGold);
            entityFound = true;
            break;
        }
    }
    if (entityFound)
    {
        var goldGainResult = server.AddCharacterVirtualCurrency({
            "PlayFabId": currentPlayerId,
            "CharacterId": characterId,
            "VirtualCurrency": "GD",
            "Amount": gold
        });

        var itemGainResult = server.GrantItemsToCharacter({
            "CatalogVersion": catalogVersion,
            "PlayFabId": currentPlayerId,
            "CharacterId": characterId,
            "Annotation": "Loot " + killedNpc,
            "ItemIds": [
                killedNpc + "DropTable"
            ]
        });
        return { "GoldGainResult": goldGainResult, "ItemGainResult": itemGainResult};
    }
    else
    {
        return { "Error": "Entity not found" };
    }
};

function rand(from, to)
{
    return Math.floor((Math.random() * to) + from);
}

handlers.CloudSetTitleData = function (args) {
    log.info("PlayFabId " + currentPlayerId);
    log.info("Bias " + args.Bias);

    var bias = args.Bias;

    var serverTitleData = server.GetTitleData({"Keys": []});
    log.info("serverTitleData " + JSON.stringify(serverTitleData));

    var biasInInt = parseInt(serverTitleData.Data[bias]);
    log.info("Previous bias " + bias + " " + biasInInt);
    biasInInt += parseInt(args[bias]);
    log.info("args[bias] " + bias + " " + args[bias]);
    log.info("Current bias " + bias + " " + biasInInt);

    //server.LogEvent(args);

    return server.SetTitleData({
        "Key": bias,
        "Value": biasInInt.toString()
    });
};

// Initialize and add a new game with the requesting player to the openGames lobby
// Returns JoinGameResult back to Unity
handlers.CloudUpdateUserInventoryItemCustomData = function (args)
{
    log.info("PlayFabId " + args.PlayFabId);
    log.info("CharacterId " + args.CharacterId);
    log.info("ItemInstanceId " + args.ItemInstanceId);
    log.info("Data " + args.Data);
    log.info("KeysToRemove " + args.KeysToRemove);

    var customData = JSON.parse(args.Data);
    server.LogEvent(args);
    return server.UpdateUserInventoryItemCustomData({
        PlayFabId: currentPlayerId,
        CharacterId: args.CharacterId,
        ItemInstanceId: args.ItemInstanceId,
        Data: customData,
    });
};

// Initialize and add a new game with the requesting player to the openGames lobby
// Returns JoinGameResult back to Unity
handlers.CreateNewGame = function(args)
{
	var startTime = Date.now();
	var uuid = CreateGUID();

	var accountInfo = server.GetUserAccountInfo({"PlayFabId" : currentPlayerId});
	
	var gameType = args.gameType;
	var classType = args.classType;
	var MMRFrom = args.MMRFrom;
	var MMR = args.MMR;
	var MMRTo = args.MMRTo;
	var preferredClasses = args.preferredClasses;//[]
	var memberCount = args.memberCount;
	
	
	var gameDetails = {};
	gameDetails[uuid] = JSON.stringify({ 
		"gameCreator" : accountInfo.UserInfo,
		"gameType" : gameType,
		"players" : [accountInfo.UserInfo],
		"preferredClasses" : preferredClasses,
		"currentClasses" : [classType],
		"MMRFrom" : MMRFrom,
		"averageMMR" : MMR,
		"MMRList" : [MMR],
		"MMRTo" : MMRTo,
		"memberCount" : memberCount,
		"gameState" : "NewGame",
		"startTime" : startTime,
		"endTime" : 0,
		"lastMoveTime" : 0,
		"winner" : ""
	});

	// note that game object is a string with JSON encoding this is noted in the documentation as "string => string" 
	server.UpdateSharedGroupData({"SharedGroupId": gameType, "Data": gameDetails, "Permission": "Public" });


	var userData = server.GetUserData({"PlayFabId" : currentPlayerId, "Keys" : ["ActiveGames"]});
	var activeGames = [];

	if(!isObjectEmpty(userData.Data))
	{
		if(!isObjectEmpty(userData.Data["ActiveGames"]))
		{
			activeGames = JSON.parse(userData.Data["ActiveGames"].Value);//it's merging..IDK it's necessary
		}
	}
	
	activeGames.push(uuid);

	server.UpdateUserData({"PlayFabId" : currentPlayerId, "Data" : { "ActiveGames" : JSON.stringify(activeGames) }, "Permission":"Public" });

	return {"GUID" : uuid, "gameType" : gameType, "gameState" : "NewGame" };
};

//somehow i was disconnected by some reason. delete all my previous request
handlers.RemovePreviouslyCreatedGamesByMe = function(args)
{
	//need another function that removes this user's previous game from all kinds of queue
	var gameTypes = args.gameTypes;
	
	var removedGames = [];
	for(var i = 0; i<gameTypes.length; i++)
	{
		var gameType = gameTypes[i];
		var listOfOpenGames = server.GetSharedGroupData({"SharedGroupId": gameType});
		for (var key in listOfOpenGames.Data) 
		{
			if (listOfOpenGames.Data.hasOwnProperty(key))
			{
				var parsed = JSON.parse(listOfOpenGames.Data[key].Value);
				if(currentPlayerId == parsed.gameCreator.PlayFabId)
				{
					var args = {};
					args.GUID = key;
					args.gameType = gameType;
					handlers.RemoveFrom_openGames(args);
					removedGames.push(key);
				}
			}
		}
	}
	return removedGames;
};

// Attempt to match the requesting player to an appropreate openGames lobby, create a new game if no suitible matches are found 
// Returns JoinGameResult back to Unity
handlers.Matchmake = function(args)
{
	//Arena2vs2LFG
	//Arena3vs3LFG
	//Arena5vs5LFG
	//WarSongBGLFG
	var gameType = args.gameType;
	var classType = args.classType;
	var MMR = args.MMR;
	var MMRFrom = args.MMRFrom;
	var MMRTo = args.MMRTo;
	var preferredClasses = args.preferredClasses;//[]
	var memberCount = args.memberCount;
	
	var listOfOpenGames = server.GetSharedGroupData({"SharedGroupId": gameType});
	
	for (var key in listOfOpenGames.Data) 
	{
		if (listOfOpenGames.Data.hasOwnProperty(key)) 
	  	{
		    var parsed = JSON.parse(listOfOpenGames.Data[key].Value); 
			
			// check to make sure not playing self && that the game is ready for a 2nd player
			if(currentPlayerId != parsed.gameCreator.PlayFabId && parsed.gameState == "NewGame")
			{
				//i'm in the preferredClasses of the room && my preference also matters
				var imPreferrable = false;
				
				//it doesn't matter to them
				if(parsed.preferredClasses.length == 0) imPreferrable = true;
				else
				{
					//im in their preference group
					if(parsed.preferredClasses.indexOf(classType) >= 0)imPreferrable = true;
					//Nope, I'm not in their preference group
					else imPreferrable = false;
				}
				
				var areYouPreferrable = false;
				//it doesn't matter to me
				if(preferredClasses.length == 0) areYouPreferrable = true;
				else
				{
					for(var i = 0; i< preferredClasses.length; i++)
					{
						for(var k = 0; k< parsed.currentClasses.length; k++)
						{
							//im in their preference group
							if(preferredClasses.indexOf(parsed.currentClasses[k]) < 0)
							{
								areYouPreferrable = false;
								break;
							}
							else
							{
								//Nope, I'm not in their preference group
								areYouPreferrable = true;
							}
						}
						if(!areYouPreferrable) break;
					}
				}
				
				var isInMMRRange = (MMR >= parsed.MMRFrom && MMR <= parsed.MMRTo);
				log.info("imPreferrable " + imPreferrable);
				log.info("areYouPreferrable " + areYouPreferrable);
				log.info("isInMMRRange " + isInMMRRange);
				if(imPreferrable && areYouPreferrable && isInMMRRange)
				{
					//proceed
					//assign PlayerB to the game
					var accountInfo = server.GetUserAccountInfo({"PlayFabId" : currentPlayerId});
					parsed.players.push(accountInfo);
					
					if(parsed.memberCount == parsed.players.length)
					{
						// remove from open lobby because the game is now full
						var args = {};
						args.GUID = key;
						args.gameType = parsed.gameType;
						handlers.RemoveFrom_openGames(args);
						

						//Add MMR List
						parsed.MMRList.push(MMR);
						//calculate averageMMR
						var averageMMR = 0;
						for(var i = 0; i< parsed.MMRList.length; i++)
						{
							averageMMR += parsed.MMRList[i];
						}
						averageMMR = averageMMR / parsed.MMRList.length;
						parsed.averageMMR = averageMMR;
						
						// move game to ip queue // check to make sure we do not assign a game to too many people
						var json = {};
						json[key] = JSON.stringify(parsed);
						
						var changedGameType = gameType.replace("LFG", "LFT"); 
						server.UpdateSharedGroupData({"SharedGroupId" : changedGameType, "Data" : json});
					}

					var userData = server.GetUserData({"PlayFabId" : currentPlayerId, "Keys" : ["ActiveGames"]});
					var activeGames = [];

					if(!isObjectEmpty(userData.Data))
					{
						if(!isObjectEmpty(userData.Data["ActiveGames"]))
						{
							activeGames = JSON.parse(userData.Data["ActiveGames"].Value);
						}
					}
					
					activeGames.push(key);

					server.UpdateUserData({"PlayFabId" : currentPlayerId, "Data" : { "ActiveGames" : JSON.stringify(activeGames) }, "Permission":"Public" });

					return {"GUID" : key , "gameState" : parsed.gameState };
				}
		  	}
	  	}
	}
	//if we make it this far then there were no suitable matches in the lfg queue, time to create a new game
	return handlers.CreateNewGame(args);
};
handlers.MatchForTeam = function(args)
{
	//Arena2vs2LFG
	//Arena3vs3LFG
	//Arena5vs5LFG
	//WarSongBGLFG
	var gameType = args.gameType;
	var GUID = args.GUID;
	log.info("gameType " + gameType);
	//if are we already matched?
	var matchedGameType = gameType.replace("LFT", "MATCHED");
	log.info("matchedGameType " + matchedGameType);
	var matchedGame = null; 
	try
	{
		log.info("Try getting matchedGame with type " + matchedGameType);
		matchedGame = server.GetSharedGroupData({"SharedGroupId": matchedGameType, "Keys": [GUID]});
	}
	catch(error)
	{
		log.info("Possibly no shared group was created with " + matchedGameType);
		server.CreateSharedGroup({"SharedGroupId" : matchedGameType});
		log.info("Successfully created shared group with " + matchedGameType);
		matchedGame = server.GetSharedGroupData({"SharedGroupId": matchedGameType, "Keys": [GUID]});
	}
	var test = "hi";
	log.info("matchedGame " + matchedGame);
	log.info("matchedGame.Data.hasOwnProperty(GUID) " + matchedGame.Data.hasOwnProperty(GUID));
	if(matchedGame && matchedGame.Data.hasOwnProperty(GUID))
	{
		var parsed = JSON.parse(matchedGame.Data[GUID].Value); 
		log.info("parsed");
		var matchedGameGUID = parsed.matchedGameGUID;
		log.info("matchedGameGUID " + matchedGameGUID);
		return {"GUID" : matchedGameGUID};
	}
	log.info("nope, we need a new match");
	//nope, we need a new match
	var requestersGame = server.GetSharedGroupData({"SharedGroupId": gameType, "Keys": [GUID]});
	var requestersGameObject = (requestersGame && requestersGame.Data[GUID]) ? JSON.parse(requestersGame.Data[GUID].Value) : null;
	if(!requestersGameObject) return {"error":"the key not found"};
	
	log.info("Got requestersGameObject");
	var listOfOpenGames = server.GetSharedGroupData({"SharedGroupId": gameType});
	
	for (var key in listOfOpenGames.Data) 
	{
		if (listOfOpenGames.Data.hasOwnProperty(key) && key != GUID) 
	  	{
		    var parsed = JSON.parse(listOfOpenGames.Data[key].Value); 
			var notMyRoom = requestersGameObject.gameCreator.PlayFabId != parsed.gameCreator.PlayFabId;
			if(notMyRoom && Math.abs(parsed.averageMMR - requestersGameObject.averageMMR) <= 50)
			{
				var args = {};
				args.GUID = GUID;
				args.gameType = parsed.gameType;
				handlers.RemoveFrom_openGames(args);
				args.GUID = key;
				handlers.RemoveFrom_openGames(args);
				
				//new GUID for each team
				var uuid = CreateGUID();
				var json = {};
				requestersGameObject.matchedGameGUID = uuid;
				parsed.matchedGameGUID = uuid;
				json[GUID] = JSON.stringify(requestersGameObject);//mine
				server.UpdateSharedGroupData({"SharedGroupId" : matchedGameType, "Data" : json});
				json = {};
				json[key] = JSON.stringify(parsed);//theirs
				server.UpdateSharedGroupData({"SharedGroupId" : matchedGameType, "Data" : json});
				log.info(GUID + " created by " + requestersGameObject.gameCreator.PlayFabId + " and " + key + " created by " + parsed.gameCreator.PlayFabId + " has been matched with " + uuid);
				return {"GUID" : uuid};
			}
	  	}
	}
	//if we make it this far then there were no suitable matches in the queue, just return "NOTFOUND" for notification
	return {"GUID" : "NOTFOUND"};
};

// Created the shared groups that will be used (like lobbies) by the matchmaker
// this fuction is only called once when setting up a shared group
handlers.InitSharedGroups = function(args)
{
	var lfg_status, ip_status;
	try
	{
		lfg_status = server.CreateSharedGroup({"SharedGroupId" : openGames});	
	}
	catch(error)
	{
		log.error(error);
	}

	try
	{
		ip_status = server.CreateSharedGroup({"SharedGroupId" : fullGames});
	}
	catch(error)
	{
		log.error(error);
	}	
};

// this account keeps the group open, its also the only account that can view / read / write and add other members
// this fuction is only called once to add accounts to a newly shared group
handlers.AddAdminAccountToGroups = function(args)
{
	var adminId = "572C1AE46640D5C6"; // my 'admin' account you will need to enter your own.

	// LFG Queue
	try
	{
		var json = {};
		json.SharedGroupId = openGames;
		json.PlayfabIds = []; 
		json.PlayfabIds.push(adminId);
		server.AddSharedGroupMembers(json);
	}
	catch (error)
	{
		log.error(error);
	}

	// IP Queue
	try
	{
		var json = {};
		json.SharedGroupId = fullGames;
		json.PlayfabIds = []; 
		json.PlayfabIds.push(adminId);
		server.AddSharedGroupMembers(json);
	}
	catch (error)
	{
		log.error(error);
	}
};

//Return everything in both queues, would include all game info, use for debug only
handlers.GetSharedGroupData = function(args)
{
	var returnvalue = {};

	var ip_data, lfg_data;
	try
	{
		ip_data = server.GetSharedGroupData({"SharedGroupId" : fullGames, "GetMembers" : true});
		lfg_data = server.GetSharedGroupData({"SharedGroupId" : openGames, "GetMembers" : true});
	}
	catch(error)
	{
		log.info(error);
	}

	returnvalue["fullGames"] = ip_data;
	returnvalue["openGames"] = lfg_data;

	return returnvalue;
};

// Removes a game from the openGames lobby
// Expected Params: 
	// args.GUID, the ID of the game to use  	
// Returns null set on success
handlers.RemoveFrom_openGames = function (args)
{
	//log.info(args.GUID);
	var json = {};
	json[args.GUID] = null;

	var result = server.UpdateSharedGroupData({"SharedGroupId" : args.gameType, "Data" : json});
	return result;
};

handlers.CleanUp = function (args)
{
	var listOfOpenGames = server.GetSharedGroupData({"SharedGroupId": args.gameType});
	var arrayToCleanUp = [];
	for (var key in listOfOpenGames.Data) arrayToCleanUp.push(key);

	for(var i = 0; i< arrayToCleanUp.length; i++)
	{
		var json = {};
		json[arrayToCleanUp[i]] = null;
		server.UpdateSharedGroupData({"SharedGroupId" : args.gameType, "Data" : json});
	}
	return arrayToCleanUp;
};


// Removes a game from the fullGames lobby
// Expected Params: 
	// args.GUID, the ID of the game to use  	
// Returns null set on success
handlers.RemoveFrom_fullGames = function (args)
{
	var json = {};
	json[args.GUID] = null;

	var result = server.UpdateSharedGroupData({"SharedGroupId" : fullGames, "Data" : json});
	return result;
};



// checks to see if an object has any properties
// Returns true for empty objects and false for non-empty objects
function isObjectEmpty(obj)
{
	if(typeof obj === 'undefined')
	{
		return true;
	}

	if(Object.getOwnPropertyNames(obj).length === 0)
	{
		return true;
	}
	else
	{
		return false;
	}
}

// creates a standard GUID string
function CreateGUID()
{
	//http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
}