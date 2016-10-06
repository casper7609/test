var openGames = "Async_LFG_Queue"; // put new and partial games here
var fullGames = "Async_IP_Queue"; // put full and complete games here

var enchantBrokenChance = 30;
var enchantNothingChance = 60;
var enchantSuccessChance = 100;
var enchantPriceInGold = 100;
var catalogVersion = "0.9";
function range(min, max)
{
    var offset = max - min;
    return rand(0, offset) + min;
}
function rand(from, to) {
    return Math.floor((Math.random() * to) + from);
}


function GetHigestLevel() {
    var allCharacters = server.GetAllUsersCharacters(
         {
             "PlayFabId": currentPlayerId
         }
    );
    var higestExp = 0;
    for (var i = 0; i < allCharacters.Characters.length; i++)
    {
        var characterId = allCharacters.Characters[i].CharacterId;
        var charStat = server.GetCharacterStatistics(
            {
                "PlayFabId": currentPlayerId,
                "CharacterId": characterId
            }
        );
        log.info("charStat " + JSON.stringify(charStat));
        var accumulatedXP = charStat.AccumulatedXP == null ? 0 : charStat.AccumulatedXP;
        higestExp = Math.max(higestExp, accumulatedXP);
    }

    log.info("higestExp " + higestExp);
    var higestLevel = GetLevel(accumulatedXP);
    log.info("higestLevel " + higestLevel);
}
function GetLevel(accumulatedXP)
{
    var currentLevel = 1;
    var currentXp = accumulatedXP;
    var xpToNextLevel = getXpToNextLevel(currentLevel);
    while (currentXp > xpToNextLevel)
    {
        currentLevel++;
        currentXp -= xpToNextLevel;
        xpToNextLevel = getXpToNextLevel(currentLevel);
    }
    return currentLevel;
}

function getXpToNextLevel(level)
{
    return parseInt(((8 * level) + diff(level)) * mxp(level, 0) * rf(level));
}
function diff(level)
{
    if (level <= 28)
    {
        return 0;
    }
    else if (level == 29)
    {
        return 1;
    }
    else if (level == 30)
    {
        return 3;
    }
    else if (level == 31)
    {
        return 6;
    }
    else if (level >= 32 && level <= 59)
    {
        return 5 * (level - 30);
    }
    return 0;
}
function mxp(level, place)
{
    if(place == 0)
        return 45 + (5 * level);
    if(place == 1)
        return 235 + (5 * level);
    if(place == 2)
        return 580 + (5 * level);
    if(place == 3)
        return 1878 + (5 * level);
    return 45 + (5 * level);
}
function rf(level)
{
    if (level <= 10)
    {
        return 1;
    }
    else if (level >= 11 && level <= 27)
    {
        return (1 - (level - 10) / 100);
    }
    else if (level >= 28 && level <= 59)
    {
        return 0.82;
    }
    else if (level >= 60)
    {
        return 1;
    }
    return 0;
}
handlers.GetEnergyPoint = function (args) {
    log.info("GetEnergyPoint called PlayFabId " + currentPlayerId);
   
    var userData = server.GetUserData(
        {
            "PlayFabId": currentPlayerId,
            "Keys": [
                "LastEnergyRequestTime"
            ],
        }
    );
    var currentTime = new Date().getTime();
    var lastUserCheckTime;
    if (userData.Data.LastEnergyRequestTime == null) {
        log.info("Need to add currentTime as LastEnergyRequestTime " + currentTime);
        var updatedUserData = server.UpdateUserData(
        {
            "PlayFabId": currentPlayerId,
            "Data": {
                "LastEnergyRequestTime": currentTime + ''
            }
        });
        log.info("UpdateResult " + JSON.stringify(updatedUserData));
        lastUserCheckTime = currentTime;
    }
    else
    {
        lastUserCheckTime = parseInt(userData.Data.LastEnergyRequestTime.Value);
        log.info("LastEnergyRequestTime " + lastUserCheckTime);
    }
    var diff = currentTime - lastUserCheckTime;
    var fiveMin = 1000 * 60 * 5;
    log.info("diff " + diff + " fiveMin " + fiveMin);

    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });

    var highestLevel = GetHigestLevel();

    var baseEnergy = userInv.VirtualCurrency.BE;
    var baseEnergyMax = 56;
    var additionalEnergy = userInv.VirtualCurrency.AE;
    var additionalEnergyMax = highestLevel * 4;
    log.info("baseEnergy " + baseEnergy);
    log.info("baseEnergyMax " + baseEnergyMax);
    log.info("additionalEnergy " + additionalEnergy);
    log.info("additionalEnergyMax " + additionalEnergyMax);

    var countToAdd = parseInt(diff / fiveMin);
    var timeSecondsLeftTillNextGen = diff % fiveMin;
    timeSecondsLeftTillNextGen = fiveMin - timeSecondsLeftTillNextGen;
    log.info("countToAdd " + countToAdd);
    timeSecondsLeftTillNextGen = Math.ceil(timeSecondsLeftTillNextGen / 1000);
    log.info("timeLeftTillNextGen " + timeSecondsLeftTillNextGen);

    var newLastUserCheckTime = currentTime - (diff % fiveMin);
    var isUpdated = false;
   
    if (countToAdd > 0) {
        //need to add
        log.info("Need to add " + countToAdd);

        if (baseEnergy >= baseEnergyMax) {
            log.info("baseEnergy is full " + baseEnergy);
            if (additionalEnergy >= additionalEnergyMax) {
                log.info("additionalEnergy is full " + additionalEnergy + " nothing to do");
                isUpdated = true;
            }
            else
            {
                //additionalEnergy 11 / max : 20
                //9 20
                var additionalDiff = additionalEnergyMax - additionalEnergy;
                additionalDiff = Math.min(additionalDiff, countToAdd);

                server.AddUserVirtualCurrency(
                    {
                        "PlayFabId": currentPlayerId,
                        "VirtualCurrency": "AE",
                        "Amount": additionalDiff
                    }
                );

                additionalEnergy += additionalDiff;
                log.info("added " + additionalDiff + " to additionalEnergy, now " + additionalEnergy);

                isUpdated = true;
            }
        }
        else
        {
            //baseEnergyMax = 20
            //baseEnergy = 11
            //countToAdd = 20
            //spaceOnBase = 9
            //valueToAddToBase = 9
            //valueToAddToAdditional = 11
            var spaceOnBase = baseEnergyMax - baseEnergy;
            var valueToAddToBase = Math.min(spaceOnBase, countToAdd);
            var valueToAddToAdditional = countToAdd - valueToAddToBase;

            if (valueToAddToBase > 0)
            {
                server.AddUserVirtualCurrency(
                   {
                       "PlayFabId": currentPlayerId,
                       "VirtualCurrency": "BE",
                       "Amount": valueToAddToBase
                   }
                );
                baseEnergy += valueToAddToBase;
                log.info("added " + valueToAddToBase + " to baseEnergy, now " + baseEnergy);
                isUpdated = true;
            }

            var additionalDiff = additionalEnergyMax - additionalEnergy;
            additionalDiff = Math.min(additionalDiff, valueToAddToAdditional);
            if (additionalDiff > 0)
            {
                server.AddUserVirtualCurrency(
                   {
                       "PlayFabId": currentPlayerId,
                       "VirtualCurrency": "AE",
                       "Amount": additionalDiff
                   }
                );
                additionalEnergy += additionalDiff;
                log.info("added " + additionalDiff + " to additionalEnergy, now " + additionalEnergy);
                isUpdated = true;
            }
        }
    }
    if (isUpdated)
    {
        var updatedUserData = server.UpdateUserData({
            "PlayFabId": currentPlayerId,
            "Data": {
                "LastEnergyRequestTime": newLastUserCheckTime + ''
            }
        });
    }

    return { Current: (additionalEnergy + baseEnergy), Max: (baseEnergyMax + additionalEnergyMax), TimeSecondsLeftTillNextGen: timeSecondsLeftTillNextGen };
};
//Town_0_Invest
handlers.InvestTown = function (args) {
    log.info("InvestTown called PlayFabId " + currentPlayerId);
    var townId = args.TownId;
    var gold = args.Gold;

    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    if (userInv.VirtualCurrency.GD < gold)
    {
        return;
    }
    var userData = server.GetUserData(
        {
            "PlayFabId": currentPlayerId,
            "Keys": [
                "Alignment"
            ],
        }
    );
    var alignment = userData.Data.Alignment.Value;
    try {
        var headers = {
            "X-MyCustomHeader": "Some Value"
        };

        var body = {
            townId: townId,
            userId: currentPlayerId,
            alignment: alignment,
            count: gold
        };

        var url = "http://52.78.158.221:8080/investment";
        var content = JSON.stringify(body);
        var httpMethod = "post";
        var contentType = "application/json";

        // The pre-defined http object makes synchronous HTTP requests
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
    } catch (err) {
        log.info("err", err.message);
    };
    server.SubtractUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "GD",
            "Amount": gold
        }
    );
};

handlers.InstantClearDungeon = function (args) {
    var townId = args.TownId;
    var townIdStr = "Town_" + townId;
    var townInfo = server.GetTitleData({
        "Keys": ["Towns"]
    });;
    var townInfoDataList = JSON.parse(townInfo.Data.Towns.replace(/\\/g, ""));
    var townInfoData = townInfoDataList[parseInt(townId)];
    //log.info("Got TownInfo " + townInfoData);
    var mobs = townInfoData.Mobs;
    var tileAvg = range(townInfoData.TileMin, townInfoData.TileMax);
    log.info("tileAvg " + tileAvg);
    args.Mobs = [];
    for (var i = 0; i < mobs.length; i++) {
        var mob = mobs[i];
        var spawnCountPerTile = range(mob.SpawnMinCountPerTile, mob.SpawnMaxCountPerTile);
        log.info(mob.Name + " " + spawnCountPerTile);
        var mobCount = mob.IsUnique ? mob.SpawnRatePerDungeon * spawnCountPerTile : tileAvg * mob.SpawnRatePerTile * spawnCountPerTile;
        log.info(mob.Name + " " + mobCount);
        args.Mobs.push({"Name":mob.Name, "Count":mobCount});
    }
    args.EmblemCount = townInfoData.EmblemCount;
    return handlers.ClearDungeon(args);
};
handlers.ClearDungeon = function (args) {
    //town1_chaotic
    //house_alignment
    //gold
    //currentPlayerId

    var townId = args.TownId;
    var townIdStr = "Town_" + townId;
    var townInfo = server.GetTitleData({
        "Keys": ["Towns"]
    });;
    //log.info("test " + townInfo.Data.Towns.replace(/\\/g, ""));
    var townInfoDataList = JSON.parse(townInfo.Data.Towns.replace(/\\/g, ""));
    var townInfoData = townInfoDataList[parseInt(townId)];
    //log.info("Got TownInfo " + townInfoData);
    var townMobs = townInfoData.Mobs;


    log.info("ClearDungeon " + currentPlayerId);
    var partyMembers = JSON.parse(args.CharacterIds);
    var mobs = args.Mobs;

    var totalExp = 0;
    var totalGold = 0;
    var totalAlignment = 0;
    var totalEmblem = range(1, args.EmblemCount);
    var items = ["Dagger_00"];
    for (var i = 0; i < mobs.length; i++) 
    {
        for (var k = 0; k < townMobs.length; k++)
        {
            if (townMobs[k].Name == mobs[i].Name)
            {
                totalExp += townMobs[k].Exp * mobs[i].Count;
                totalGold += townMobs[k].Gold * mobs[i].Count;
                totalAlignment += townMobs[k].Alignment * mobs[i].Count;
                for (var j = 0; j < mobs[i].Count; j++) {
                    var randomItem = server.EvaluateRandomResultTable(
                        {
                            "CatalogVersion": catalogVersion,
                            "PlayFabId": currentPlayerId,
                            "TableId": "WolfDropTable"
                        }
                    );

                    if (randomItem.ResultItemId != "Nothing") {
                        log.info("item " + JSON.stringify(randomItem));
                        items.push(randomItem.ResultItemId);
                    }
                }
                break;
            }
        }
    }

    var realItem = server.GrantItemsToUser(
        {
            "CatalogVersion": catalogVersion,
            "PlayFabId": currentPlayerId,
            "ItemIds": items
        }
    );

    for (var i = 0; i < partyMembers.length; i++)
    {
        var charStat = server.GetCharacterStatistics(
            {
                "PlayFabId": currentPlayerId,
                "CharacterId": partyMembers[i]
            }
        );
        var previousExp = charStat.CharacterStatistics.AccumulatedXP;
        //fresh character
        if (previousExp == null)
        {
            previousExp = 0;
        }
        server.UpdateCharacterStatistics(
            {
                "PlayFabId": currentPlayerId,
                "CharacterId": partyMembers[i],
                "CharacterStatistics": {
                    "AccumulatedXP": previousExp + totalExp,
                }
            }
        );
        log.info("eachExp " + totalExp + " for " + partyMembers[i]);
    }

    server.AddUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "GD",
            "Amount": totalGold
        }
    );
    log.info("totalGold " + totalGold);

    server.AddUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "EB",
            "Amount": totalEmblem
        }
    );
    log.info("totalEmblem " + totalEmblem);

    totalAlignment = parseInt(totalAlignment, 10);
    server.UpdatePlayerStatistics(
        {
            "PlayFabId": currentPlayerId,
            "Statistics": [
                {
                    "StatisticName": "Alignment",
                    "Value": totalAlignment
                }
            ]
        }
    );
    log.info("totalAlignment " + totalAlignment);

    //Town_0_Occupation
    //http://52.78.158.221:8080/occupation?townId=0&userId=playerA&alignment=Chaotic&count=1

    var userData = server.GetUserData(
        {
            "PlayFabId": currentPlayerId,
            "Keys": [
                "Alignment"
            ],
        }
    );
    var alignment = userData.Data.Alignment.Value;
    //log.info("userData", JSON.stringify(userData));
    try {
        var headers = {
            "X-MyCustomHeader": "Some Value"
        };

        var body = {
            townId: args.TownId,
            userId: currentPlayerId,
            alignment: alignment,
            count: totalAlignment
        };

        var url = "http://52.78.158.221:8080/occupation";
        var content = JSON.stringify(body);
        var httpMethod = "post";
        var contentType = "application/json";

        // The pre-defined http object makes synchronous HTTP requests
        var response = http.request(url, httpMethod, content, contentType, headers);
        log.info("response", response);
    } catch (err) {
        log.info("err", err.message);
    };

    return {
        "TotalExp": totalExp,
        "TotalGold": totalGold,
        "TotalAlignment": totalAlignment,
        "TotalEmblem": totalEmblem,
        "Items": items
    };
};

handlers.EnchantItem = function (args) {
    log.info("PlayFabId " + args.PlayFabId);
    log.info("CharacterId " + args.CharacterId);
    log.info("ItemInstanceId " + args.ItemInstanceId);
    log.info("CatalogVersion " + args.CatalogVersion);

    var characterId = args.CharacterId;
    var itemInstanceId = args.ItemInstanceId;
    var catalogVersion = args.CatalogVersion;

    var userInventory = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });

    //check if sufficient fund
    if (userInventory.VirtualCurrency == null
        || userInventory.VirtualCurrency.GD == null
        || parseInt(userInventory.VirtualCurrency.GD) < enchantPriceInGold) {
        log.info("Insufficient Fund");
        return { "Error": "Insufficient Fund" };
    }

    var itemToEnchant = null;
    if (characterId == "") {
        for (var i = 0; i < userInventory.Inventory.length; i++) {
            var item = userInventory.Inventory[i];
            if (item.ItemInstanceId == args.ItemInstanceId) {
                itemToEnchant = item;
                break;
            }
        }
    }
    else
    {
        var characterInventory = server.GetCharacterInventory({
            "PlayFabId": currentPlayerId,
            "CharacterId": characterId,
            "CatalogVersion": catalogVersion
        });
        for (var i = 0; i < characterInventory.Inventory.length; i++) {
            var item = characterInventory.Inventory[i];
            if (item.ItemInstanceId == args.ItemInstanceId) {
                itemToEnchant = item;
                break;
            }
        }
    }
    
    if (itemToEnchant == null)
    {
        return { "Error": "Item Not Found" };
    }

    var enchantResult = 0;
    var prevEnchant = 0;
    var goldSubtractResult = null;
    goldSubtractResult = server.SubtractUserVirtualCurrency({
        "PlayFabId": currentPlayerId,
        "VirtualCurrency": "GD",
        "Amount": enchantPriceInGold
    });

    var odd = Math.floor((Math.random() * 100) + 1);
    log.info("odd " + odd);
    if (odd < enchantBrokenChance) {
        log.info("item broken");
        if (characterId == "") {
            var consumeItemResult = server.ConsumeItem({
                "PlayFabId": currentPlayerId,
                "ItemInstanceId": itemInstanceId,
                //"CharacterId": characterId,
                "ConsumeCount": 1
            });
        }
        else
        {
            var consumeItemResult = server.ConsumeItem({
                "PlayFabId": currentPlayerId,
                "ItemInstanceId": itemInstanceId,
                "CharacterId": characterId,
                "ConsumeCount": 1
            });
        }
       
        enchantResult = 0;
    }
    else if (enchantBrokenChance <= odd && odd <= enchantNothingChance) {
        log.info("nothing happened");
        enchantResult = 1;
    }
    else {
        if (itemToEnchant.CustomData != null && itemToEnchant.CustomData.Enchant != null) {
            prevEnchant = parseInt(itemToEnchant.CustomData.Enchant);
        }
        log.info("enchant success prevEnchant " + prevEnchant);
        prevEnchant++;
        log.info("enchant success current enchant " + prevEnchant);

        var enchantSuccessResult = server.UpdateUserInventoryItemCustomData({
            PlayFabId: currentPlayerId,
            CharacterId: characterId,
            ItemInstanceId: itemInstanceId,
            Data: { "Enchant": prevEnchant },
        });
        enchantResult = 2;
    }
    //1. enchant success
    //2. nothing
    //3. break
    return { "EnchantResult": enchantResult, "EnchantValue": prevEnchant, "GoldSubtractResult": goldSubtractResult };
};


handlers.CloudSellItem = function (args) {
    var characterId = args.CharacterId;
    var items = JSON.parse(args.Items);
    var catalogVersion = args.CatalogVersion;
    log.info("characterId " + characterId);
    log.info("items " + items.length);

    var catalogItems = server.GetCatalogItems({
        "CatalogVersion": catalogVersion
    });

    var gold = 0;

    for (var i = 0; i < catalogItems.Catalog.length; i++) {
        var item = catalogItems.Catalog[i];
        log.info("catalogItems " + item);
        for (var k = 0; k < items.length; k++) {
            var itemId = items[k].ItemId;
            var itemInstanceId = items[k].InstanceId;
            log.info("itemId " + itemId);
            log.info("itemInstanceId " + itemInstanceId);
            log.info("catalogItems itemId " + item.ItemId);
            if (item.ItemId == itemId)
            {
                var storePrice = parseInt(item.VirtualCurrencyPrices.GD);
                if (storePrice == 0)
                    storePrice = 1;//free item gets 1 gold price when resell...
                else
                    storePrice = storePrice / 2;
                gold += storePrice;
                log.info("gold " + gold);
                var consumeItemResult = server.ConsumeItem({
                    "PlayFabId": currentPlayerId,
                    "ItemInstanceId": itemInstanceId,
                    //"CharacterId": characterId,
                    "ConsumeCount": 1
                });
                log.info("consumeItemResult " + consumeItemResult);
                break;
            }
        }
    }
    
    var goldGainResult = server.AddUserVirtualCurrency(
         {
             "PlayFabId": currentPlayerId,
             "VirtualCurrency": "GD",
             "Amount": gold
         }
     );
    return { "GoldGainResult": goldGainResult, "ItemSoldResult": args.Items };
};

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

handlers.CloudUpdateUserInventoryItemCustomData = function (args)
{
    log.info("PlayFabId " + args.PlayFabId);
    log.info("CharacterId " + args.CharacterId);
    log.info("ItemInstanceId " + args.ItemInstanceId);
    log.info("Data " + args.Data);
    log.info("KeysToRemove " + args.KeysToRemove);

    //var customData = JSON.parse(args.Data);
    //server.LogEvent(args);
    return server.UpdateUserInventoryItemCustomData({
        PlayFabId: currentPlayerId,
        CharacterId: args.CharacterId,
        ItemInstanceId: args.ItemInstanceId,
        Data: args.Data,
    });
};

handlers.EquipItem = function (args) {
    //unequip
    if (args.PrevItemInstanceId != "") {
        handlers.UnEquipItem(args);
    }
    log.info("ItemToEquipInstanceId " + args.ItemToEquipInstanceId);
    //equip
    server.MoveItemToCharacterFromUser({
        "PlayFabId": args.PlayFabId,
        "CharacterId": args.CharacterId,
        "ItemInstanceId": args.ItemToEquipInstanceId
    });
};

handlers.UnEquipItem = function (args) {
    log.info("PlayFabId " + args.PlayFabId);
    log.info("CharacterId " + args.CharacterId);
    log.info("PrevItemInstanceId " + args.PrevItemInstanceId);
    server.MoveItemToUserFromCharacter({
        "PlayFabId": args.PlayFabId,
        "CharacterId": args.CharacterId,
        "ItemInstanceId": args.PrevItemInstanceId
    });
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