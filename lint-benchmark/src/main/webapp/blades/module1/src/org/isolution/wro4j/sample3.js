/*globals caplin: false, ko: false, gmp: false, jQuery: false, Loader, ct */

/**
 * AddEditBeneficiaryComponent
 *
 * @constructor
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent = function () {
    this.userSession = gmp.model.session.SessionModel.getInstance();

    // bindings for edition
    this.isEditingBeneficiary = ko.observable(false);
    this.editingBeneficiaryCode = ko.observable("");

    this.editingBeneficiaryCode.subscribe(function (newValue) {
        this.isEditingBeneficiary(newValue !== null);
        if (newValue !== null) {
            this._initDataService();
        }
    }, this);

    this.approvalType = ko.observable('first');
    this.popupTemplateToDisplay = ko.observable("");
    this.popupParameterizedContent = ko.observable("");

    this.session = gmp.model.session.SessionModel.getInstance();

    this._initDataService();
    this._createBindings();

    this.navigationProxy = caplin.core.event.EventHub.GlobalEventHub.getProxy("gmp.event.NavigationEventListener", "gmp.layout");
    this.messagePopupProxy = caplin.core.event.EventHub.GlobalEventHub.getProxy("gmp.component.popup.MessageDisplayListener", "gmp.message");

    caplin.core.event.EventHub.GlobalEventHub.subscribe("gmp.event.EditPendingItemListener", "gmp.component.beneficiary.approve", this);
};

/**
 * Inheritance.
 */



gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.editItem = function (code) {
    this.editingBeneficiaryCode(code);
    this.isWaitingDataFromServer(true);
    this._sendEditBeneficiaryRequest();
};

/**
 * (Override) Called after the component has been shown on the page for the first time. Only
 * called once.
 *
 * Request the initial new beneficiary data from DataService once and remember it.
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.onOpen = function () {
    if (!this.isEditingBeneficiary()) {
        this._sendNewBeneficiaryRequest();
    }
};

/**
 * (Override) Called after the component has been made visible every time after
 * the first time (not called the first time component is shown; onOpen is instead).
 *
 * Re-apply the initial new beneficiary data to reset the component to it's default state.
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.onShow = function () {
    gmp.component.knockout.KnockoutComponent.prototype.onShow.call(this);
    this._applySavedNewBeneficiaryResponse(false); // false - isInitialResponse flag
};

/**
 * (Override) Called after the component has been made invisible on the page.
 * Schedule a function to clear the models to reset the component to its default state.
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.onHide = function () {
    gmp.component.knockout.KnockoutComponent.prototype.onHide.call(this);
    var self = this;
    setTimeout(function () {
        self.resetModel();
    }, 0);
};

/**
 * (Override) Called after the component has been made invisible on the page.
 * Schedule a function to clear the models to reset the component to its default state.
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.resetModel = function () {
    // reset model defaults (but keep current: "unsanctionedCountries")
    this.clientBeneficiaryModel().resetModel();

    this.isBankSwiftBicAvailable(true);
    this.isBankSwiftBicAvailableAsBooleanString("true");
    this.isAdditionalInformationSupplied(false);
    this.isAdditionalInformationSuppliedAsBooleanString("false");

    this.bankDetailsSwiftChooserViewModel().resetModel();
    this.additionalBankDetailsSwiftChooserViewModel().resetModel();

    this.bankDetailsDisplayModel().resetModel();
    this.editingBeneficiaryCode(null);
};

/**
 * (UI Action) Called when the user closes the available currencies multiselect drop down.
 *
 * When CNY (China) is selected or deselected, need to slide out or hide the CNY checkbox "terms
 * and conditions" confirmation panel.
 *
 * Note: If CNY has been removed from the selected currencies the checked state of the checkbox
 *       is *not* reset to unchecked as per the existing SDP implementation.
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.goCloseMultiselect = function () {
    this._toggleCnyTermsAndconditionsWarning();
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._toggleCnyTermsAndconditionsWarning = function () {
    // (note: slideDown() / slideUp() have no effect if panel is already visible/invisible.)
    var selectedCcys = this.clientBeneficiaryModel().beneficiaryDetails().paymentCcys(),
        cnyWarning = jQuery("#beneCnyWarning");

    if (selectedCcys !== null && jQuery.inArray("CNY", selectedCcys) !== -1) {
        cnyWarning.slideDown();
    } else {
        cnyWarning.slideUp();

        // GMP-143 (updated criteria): The T&C checkbox should be unchecked when CNY has been removed
        this.clientBeneficiaryModel().beneficiaryDetails().hasAcceptedCnyTC(false);
    }
};

/**
 * (UI Action) Called when the user selects a new SWIFT/BIC bank in the SWIFT chooser.
 *
 * The "this.clientBeneficiaryModel().bankDetails()" model is automatically updated
 * because it subscribes to the internal view model of the SWIFT chooser widget.
 *     "bankId", "bankName", "bankAddress", "bankCountryCode", "bankSwiftCode"
 *
 * 1) Reset the user changeable fields:
 *     "bankFca", "bankAccountNumber", "bankClearingCode"
 * 2) Recreate the field config display model using the selected SWIFT chooser bank.
 *
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.goBankDetailsSwiftChooserChange = function (/* newBankId */) {
    this._resetBankDetailsForUserInput();
    this._recreateBankDetailsDisplayModel(this.bankDetailsSwiftChooserViewModel().fieldConfig());
};

/**
 *
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.goAdditionalBankDetailsSwiftChooserChange = function () {
    this._resetAdditionalBankDetailsForUserInput();
};

/**
 * (Subscription) Called when the selected country is changed either by:
 *      (1) selecting a SWIFT bank
 *      (2) selecting a country in the drop down
 *
 * Only when (2) do the following:
 * - Recreate the field config display model (the SWIFT mode already has this info)
 * - Reset the user changeable fields: "bankFca", "bankAccountNumber", "bankClearingCode"
 *
 * @param {String} newCountryCode - The Code for the new country selected in the
 *
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._didChangeBankDetailsCountryCode = function (newCountryCode) {

    if (!this.isBankSwiftBicAvailable()) {
        if (newCountryCode !== "") {
            // call REST API for fieldConfig for selected country
            var sendOptionsData = {
                countryCode: newCountryCode
            };
            var successHandler = function (data) {
                gmp.core.Logger.log("gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._didChangeBankDetailsCountryCode#successHandler");

                this.clientBeneficiaryModel().bankDetails().bankRegion(data.bankRegion);

                this.clientBeneficiaryModel().bankDetails().ibanFormats(data.ibanFormats);

                this._recreateBankDetailsDisplayModel(data.fieldConfig);
            };
            this._handleSendGetBankDetailsConfig(sendOptionsData, successHandler);
        } else {
            this.bankDetailsDisplayModel().resetModel();
        }

        this._resetBankDetailsForUserInput();
    }
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._goAddOrSaveBeneficiary = function (eventToSend) {
    var clientBeneficiaryModelValidation = this.clientBeneficiaryModel().startValidationGroup();

    if (this.clientBeneficiaryModel().isValid()) {

        eventToSend.call(this);
    } else {
        clientBeneficiaryModelValidation.showAllMessages();

        gmp.core.Utils.scrollUpToFirstValidationError(this.eElement);
    }

    this.clientBeneficiaryModel().endValidationGroup();
};

/**
 * (UI Action) Create a new beneficiary.
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.goAddBeneficiary = function () {
    this._goAddOrSaveBeneficiary(this._sendBeneficiaryCreate);
};

/**
 * (UI Action) Edit a beneficiary
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.goSaveBeneficiary = function () {
    this._goAddOrSaveBeneficiary(this._sendBeneficiarySave);
};

/**
 * (UI Action) Cancel edition and go back to approval screen
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.goCancelBeneficiaryEdition = function () {
    this._returnFromEdit(false);
};

/**
 * (UI Action)
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.hidePopup = function () {
    this.messagePopupProxy.hideMessage();
    jQuery('.popupContent', this.eElement).hide();
};

//gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.goHideActivePopup = function() {
//    this.messagePopupProxy.hideMessage();
//
//};

// private

/**
 * Invoke the listener passing on the beneficiary code to go back to the approve
 * pending beneficiaries. Once that's done, clean the bene code
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._returnFromEdit = function (showGritterOnReturn) {
    if (showGritterOnReturn) {
        this._displaySuccessGritter("approvals.beneficiary.gritter.updated");
    }
    this.navigationProxy.back();
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._displaySuccessGritter = function (i18nMessage) {
    jQuery.gritter.add({
        title: ct.i18n(i18nMessage),
        image: "images/en/iconTickSuccess.gif",
        text: "  "
    });
};

/**
 * Initialise the data service.
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._initDataService = function () {
    // set-up shared DataService
    this.dataPaths = {
        BENEFICIARIES_NEW: "beneficiaries/new",
        BENEFICIARIES_CREATE: "beneficiaries",
        BENEFICIARIES_EDIT: "beneficiaries/" + this.editingBeneficiaryCode() + "/edit",
        BENEFICIARIES_SAVE: "beneficiaries/" + this.editingBeneficiaryCode(),
        BENEFICIARIES_BANK_SEARCH_BY_COUNTRY: "beneficiaries/bankdetailsconfig/new"
    };
    this.dataService = gmp.services.DataService.getInstance();
};

/**
 * Create the KnockoutJS bindings used by this component.
 *
 * REST API 'beneficiaries/new' Mapped Bindings:
 *     availableCcys
 *     unsanctionedCountries
 *     clientBeneficiaryModel
 *
 * UI Bindings:
 *     selectedCcysFullText
 *     selectedCcysTruncatedText
 *     isBankSwiftBicAvailable
 *     isAdditionalInformationSupplied
 *     bankDetailsDisplayModel
 *
 * UI Radio Group Helpers
 *     isBankSwiftBicAvailableAsBooleanString
 *     isAdditionalInformationSuppliedAsBooleanString
 *
 * UI Permissions Bindings
 *     hasGrant_ADD_BENE_ADDITIONAL_INFO
 *
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._createBindings = function () {
    var self = this;
    // REST API bindings: "beneficiaries/new"
    //this.availableCcys = ko.observableArray([]);
    this.unsanctionedCountries = ko.observableArray([]);
//    this.chosenCountryCode = ko.observable(); // can be either from te swiftcode or the user selected country
    this.clientBeneficiaryModel = ko.observable(new gmp.component.beneficiary.model.ClientBeneficiaryModel());

    // UI helper bindings..

    // ..text for the selected currencies truncated label and more info popup (updated automatically when "paymentCcys" changes)
    this.selectedCcysFullText = ko.observable("");
    this.selectedCcysTruncatedText = ko.observable("");
    this.shouldShowCcyTooltip = ko.observable("");

    // ..a boolean for the 2 "Yes / No" radio button groups (default model *not* coming in server model)
    this.isBankSwiftBicAvailable = ko.observable(true);
    this.isAdditionalInformationSupplied = ko.observable(false);

    // Radio Group Workaround Helpers..

    // ..for "SWIFT / BIC available ?" radios. need a 'boolean String' wrapper around 'isBankSwiftBicAvailable'
    this.isBankSwiftBicAvailableAsBooleanString = ko.observable(this.isBankSwiftBicAvailable().toString());
    this.isBankSwiftBicAvailableAsBooleanString.subscribe(function (newValue) {
        self.isBankSwiftBicAvailable(newValue === "true");
    }, this);

    // ..for "Additional information ?" radios. need a 'boolean String' wrapper around 'isAdditionalInformationSupplied'
    this.isAdditionalInformationSuppliedAsBooleanString = ko.observable(this.isAdditionalInformationSupplied().toString());
    this.isAdditionalInformationSuppliedAsBooleanString.subscribe(function (newValue) {
        self.isAdditionalInformationSupplied(newValue === "true");
    }, this);

    // Swift Chooser Widgets - View Models
    this.bankDetailsSwiftChooserViewModel = ko.observable(new gmp.component.beneficiary.model.BankLookupBySwiftModel());
    this.additionalBankDetailsSwiftChooserViewModel = ko.observable(new gmp.component.beneficiary.model.BankLookupBySwiftModel());

    // Swift Chooser Widgets - View Models' Subscriptions
    this._subscribeToSwiftChooserViewModel(
        this.bankDetailsSwiftChooserViewModel(),
        this.clientBeneficiaryModel().bankDetails());

    this._subscribeToSwiftChooserViewModel(
        this.additionalBankDetailsSwiftChooserViewModel(),
        this.clientBeneficiaryModel().additionalBankDetailsInformation());

    this.clientBeneficiaryModel().bankDetails().bankCountryCode.subscribe(function (val) {
        gmp.core.Logger.log("this.clientBeneficiaryModel().bankDetails().bankCountryCode.subscribe [" + val + "]");
        self._didChangeBankDetailsCountryCode(val);
    }, this);

    // Display model for "Bank details" field configuration.
    // - in the HTML, the bank details' field label, visibility, enabled, and mandatory (red asterick) are bound to this model.
    // - this model (not the wrapping observable) is recreated as necessary (from the REST API: "beneficiaries/bankdetailsconfig/new?...") when:
    //     - 1) a SWIFT bank is selected
    //     - 2) a Country is selected
    //     - 2) the FCA checkbox is toggled (note: the FCA response is cached for that SWIFT bank)
    this.bankDetailsDisplayModel = ko.observable(new gmp.component.beneficiary.model.BankDetailsDisplayModel());
    this.additionalBankDetailsDisplayModel = ko.observable(new gmp.component.beneficiary.model.AdditionalBankDetailsInformationModel());

    // UI event subscriptions..

    // ..did modify "paymentCcys" (Multiselect drop down)
    this.clientBeneficiaryModel().beneficiaryDetails().paymentCcys.subscribe(this._didModifyPaymentCcys, this);

    this._subscribeToggles();

    // Permission bindings
    this.hasGrant_ADD_BENE_ADDITIONAL_INFO = ko.computed(function () {
        return self.hasPermission("ADD_BENE_ADDITIONAL_INFO");
    }, this);

    // other internal references
    this._fcaFieldConfigCache = null;

    // for showing a blocker loading window when loading data for bene edition
    this.isWaitingDataFromServer = ko.observable(false);

    // GMP-430 - chinese or australian bank
    this.disableIntermediarySwiftBic = ko.computed(function () {
        var bankCountryCode = this.clientBeneficiaryModel().bankDetails().bankCountryCode();
        return (bankCountryCode === "CN" || bankCountryCode === "AU");
    }, this);

    this.enableIntermediarySwiftBicValidation = ko.computed(function () {
        return this.isAdditionalInformationSupplied() && !this.disableIntermediarySwiftBic();
    }, this);

    this.disableIntermediarySwiftBic.subscribe(function (newValue) {
        if (newValue) {
            this.clientBeneficiaryModel().additionalBankDetailsInformation().resetModel();

            jQuery("#intermediaryBankSwiftBicSearch_input").val("");
            jQuery("#intermediaryBankSwiftBicSearch_input").addClass("watermark");
            jQuery("#intermediaryBankSwiftBicSearch_hidden").val("");
        }
    }, this);

    // Validation
    var user = gmp.model.session.SessionModel.getInstance().loggedInUserModel();
    this.clientBeneficiaryModel().initValidation(
        user.domicile().countryCode(),
        user.domicile().defaultCcy(),
        this.dataService,
        this.isBankSwiftBicAvailable,               // 'isSwiftModeValidationActive' - only if showing SWIFT UI
        this.isAdditionalInformationSupplied,       // 'isAdditionalBankDetailsValidationActive' - only if showing additional info UI
        this.enableIntermediarySwiftBicValidation   // when the country is China or Australia, no need to validate
    );

};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._subscribeToggles = function () {
    // ..did toggle "Swift / BIC available?" (Yes / No radios)
    this.isBankSwiftBicAvailableSubscription = this.isBankSwiftBicAvailable.subscribe(this._didToggleIsBankSwiftBicAvailable, this);
    // ..did toggle "Additional Information" (Yes / No radios)
    this.isAdditionalInformationSuppliedSubscription = this.isAdditionalInformationSupplied.subscribe(this._didToggleIsAdditionalInformationSupplied, this);
    // ..did toggle "FCA" (checkbox)
    this.bankFcaSubscription = this.clientBeneficiaryModel().bankDetails().bankFca.subscribe(this._didToggleBankFca, this);
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._disposeSubscriptionToggles = function () {
    this.isBankSwiftBicAvailableSubscription.dispose();
    this.isAdditionalInformationSuppliedSubscription.dispose();
    this.bankFcaSubscription.dispose();
};

/**
 * Manually subscribe to property updates in the 'swiftChooserViewModel' param.
 * Updates are mirrored into the 'bankModel' param. The 'bankModel' is expected to
 * have the following observables defined:
 *     bankId, bankName, bankAddress, bankCountryCode
 *
 * @param {gmp.component.beneficiary.model.BankLookupBySwiftModel} swiftChooserViewModel
 * @param {Object} bankModel
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._subscribeToSwiftChooserViewModel = function (swiftChooserViewModel, bankModel) {
    // note: need to trigger evaluation of the lazy ko.computed properties here. otherwise they
    //       would never be evaluated as they are not directly referenced anywhere else.
    swiftChooserViewModel.bankId();
    swiftChooserViewModel.bankName();
    swiftChooserViewModel.bankAddress();
    swiftChooserViewModel.bankCountryCode();
    swiftChooserViewModel.bankRegion();
    swiftChooserViewModel.bankBicSwift();
    swiftChooserViewModel.ibanFormats();

    // subscribe to the swift view model updates and mirror
    this.swiftChooseBankIdSubscription = swiftChooserViewModel.bankId.subscribe(function (newValue) {
        bankModel.bankId(newValue);
    });
    this.swiftChooseBankNameSubscription = swiftChooserViewModel.bankName.subscribe(function (newValue) {
        bankModel.bankName(newValue);
    });
    this.swiftChooseBankAddressSubscription = swiftChooserViewModel.bankAddress.subscribe(function (newValue) {
        bankModel.bankAddress(newValue);
    });
    this.swiftChooseBankCountryCodeSubscription = swiftChooserViewModel.bankCountryCode.subscribe(function (newValue) {
        gmp.core.Logger.log("gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._subscribeToSwiftChooserViewModel [" + newValue + "]");
        bankModel.bankCountryCode(newValue);
    });
    this.swiftChooseBankRegionSubscription = swiftChooserViewModel.bankRegion.subscribe(function (newValue) {
        gmp.core.Logger.log("gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._subscribeToSwiftChooserViewModel [" + newValue + "]");
        bankModel.bankRegion(newValue);
    });
    this.swiftChooseBankSwiftSubscription = swiftChooserViewModel.bankBicSwift.subscribe(function (newValue) {
        // TODO: rename mismatched model property 'bankSwiftCode' -> 'bankBicSwift'
        bankModel.bankSwiftCode(newValue);
    });
    this.swiftChooseBankIbanFormats = swiftChooserViewModel.ibanFormats.subscribe(function (newValue) {
        gmp.core.Logger.log("gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._subscribeToSwiftChooserViewModel");
        bankModel.ibanFormats(newValue);
    });
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._disposeSubscriptionToSwiftChooserViewModel = function () {
    this.swiftChooseBankIdSubscription.dispose();
    this.swiftChooseBankNameSubscription.dispose();
    this.swiftChooseBankAddressSubscription.dispose();
    this.swiftChooseBankCountryCodeSubscription.dispose();
    this.swiftChooseBankSwiftSubscription.dispose();
    this.swiftChooseBankIbanFormats.dispose();
};

/**
 * Call REST API: beneficiaries/new
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._sendNewBeneficiaryRequest = function () {
    var sendOptions = {
        type: "GET",
        data: null,
        callbackObject: this,
        successHandler: this._handleSuccessNewBeneficiary
    };
    this.dataService.send(this.dataPaths.BENEFICIARIES_NEW, sendOptions);
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._handleSuccessNewBeneficiary = function (data) {
    this._logSuccess(this.dataPaths.BENEFICIARIES_NEW, data);

    // ensure radio bindings will have full effect in IE7 when response applied below
    this._forceRadioBindingsUpdate();

    // remember response and apply immediately
    this.savedNewBeneficiaryResponse = data;
    this._applySavedNewBeneficiaryResponse(true); // true - isInitialResponse flag

    this.bindDOM();
};

/**
 * Apply the saved JSON response (from the 'beneficiaries/new' REST API) to
 * the component either directly to individual observables or others via the
 * knockout 'mapping plug-in'.
 *
 * @param {Boolean} isInitialResponse - Determines whether this is the first time
 *     the "this.savedNewBeneficiaryResponse" JSON is being applied to the component.
 *
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._applySavedNewBeneficiaryResponse = function (isInitialResponse) {
    var countries, self = this;

    if (this.savedNewBeneficiaryResponse) {
        // "unsanctionedCountries" DOM one time only. Is sufficient until countries appear/disappear between ajax requests :)
        if (self.unsanctionedCountries().length === 0) {
            countries = self.savedNewBeneficiaryResponse.unsanctionedCountries.sort(function(a,b) {
                if (a.name > b.name) {
                    return 1;
                }
                else if (b.name > a.name) {
                    return -1;
                }
                else {
                    return 0;
                }
            });
            self.unsanctionedCountries(countries);
        }

        // other UI updates not fully under the control of the bindings system..
        this._clearSwiftDOMInputs(true, true);
        this._resetOtherDOM();

        // this is edition
        if (isInitialResponse && this.isEditingBeneficiary()) {
            if (null === this.savedNewBeneficiaryResponse.clientBeneficiaryModel.bankDetails.bankSwiftCode) {
                this.isBankSwiftBicAvailableAsBooleanString("false");
            } else {
                this.isBankSwiftBicAvailableAsBooleanString("true");
            }

            if (this.savedNewBeneficiaryResponse.clientBeneficiaryModel.additionalBankDetailsInformation.bankSwiftCode ||
                this.savedNewBeneficiaryResponse.clientBeneficiaryModel.additionalBankDetailsInformation.forFurtherCreditTo) {
                this.isAdditionalInformationSuppliedAsBooleanString("true");
            } else {
                this.isAdditionalInformationSuppliedAsBooleanString("false");
            }

            this.clientBeneficiaryModel().fromJS(this.savedNewBeneficiaryResponse.clientBeneficiaryModel);

            if (this.isBankSwiftBicAvailable()) {
                jQuery("#bankSwiftBicSearch_input").val(this.savedNewBeneficiaryResponse.clientBeneficiaryModel.bankDetails.bankSwiftCode);
                jQuery("#bankSwiftBicSearch_input").removeClass("watermark");
                jQuery("#bankSwiftBicSearch_hidden").val(this.savedNewBeneficiaryResponse.clientBeneficiaryModel.bankDetails.bankId);
            }
            var fcaEnabled = this.savedNewBeneficiaryResponse.clientBeneficiaryModel.bankDetails.bankFca || false;

            this._getBankFieldDisplayDetails(fcaEnabled);

            if (this.isAdditionalInformationSupplied()) {
                jQuery("#intermediaryBankSwiftBicSearch_input").val(this.savedNewBeneficiaryResponse.clientBeneficiaryModel.additionalBankDetailsInformation.bankSwiftCode);
                jQuery("#intermediaryBankSwiftBicSearch_input").removeClass("watermark");
                jQuery("#intermediaryBankSwiftBicSearch_hidden").val(this.savedNewBeneficiaryResponse.clientBeneficiaryModel.additionalBankDetailsInformation.bankId);
            }

            this.isWaitingDataFromServer(false);

            this._toggleCnyTermsAndconditionsWarning();
        }
    }
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._sendEditBeneficiaryRequest = function () {
    var sendOptions = {
        type: "GET",
        data: null,
        callbackObject: this,
        successHandler: this._handleSuccessEditBeneficiary
    };
    this.dataService.send(this.dataPaths.BENEFICIARIES_EDIT, sendOptions);
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._handleSuccessEditBeneficiary = function (data) {
    this._logSuccess(this.dataPaths.BENEFICIARIES_EDIT, data);

    // ensure radio bindings will have full effect in IE7 when response applied below
    this._forceRadioBindingsUpdate();

    // remember response and apply immediately
    this.savedNewBeneficiaryResponse = data;
    this.bindDOM();
    this._applySavedNewBeneficiaryResponse(true); // true - isInitialResponse flag


};

/**
 * (Subscription) Called when the user changes the selected currencies in the Multiselect drop down.
 *
 * Update the text label for the selected currencies (possibly truncated), as well as the non truncated
 * hover popup. The hover text automatically wraps and flows down when the CSS max-width is reached.
 *
 * @param {String[]} paymentCcysNewValue - An array of strings for the currently selected currencies.
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._didModifyPaymentCcys = function (paymentCcysNewValue) {
    // create a list of comma+space separated items, basically for the hover popup
    // so that the text is wrapped and flows down when the CSS "max-width" is reached
    var maxLength = 8,
        fullText = "",
        truncatedText = "",
        showCcyTooltip = false,
        upperBound, i;

    if (paymentCcysNewValue !== null && paymentCcysNewValue.length > 0) {
        upperBound = paymentCcysNewValue.length - 1;
        for (i = 0; i <= upperBound; ++i) {
            fullText += paymentCcysNewValue[i];
            if (i < upperBound) {
                fullText += ", ";
            }
        }
        if (fullText.length > maxLength) {
            truncatedText = fullText.slice(0, maxLength) + "...";
            showCcyTooltip = true;
        }
        else {
            truncatedText = fullText;
        }
    }
    // update observables
    this.shouldShowCcyTooltip(showCcyTooltip);
    this.selectedCcysFullText(fullText);
    this.selectedCcysTruncatedText(truncatedText);

    this.clientBeneficiaryModel().beneficiaryDetails().disablePaymentCcysValidation();
};

/**
 * (Subscription) Called when the user toggles the "Swift / BIC?" radios.
 * Always reset the entire "Bank details" section after toggling the Swift Yes/No radios.
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._didToggleIsBankSwiftBicAvailable = function (isBankSwiftBicAvailableNewValue) {
    this.bankDetailsSwiftChooserViewModel().resetModel();
    this.clientBeneficiaryModel().bankDetails().resetModel();
    this.bankDetailsDisplayModel().resetModel();

    if (isBankSwiftBicAvailableNewValue) {
        this._clearSwiftDOMInputs(true, false);
    }
};

/**
 * (Subscription) Called when the user toggles the "Additional information?" radios.
 * Always reset the entire "Additional information" section after toggling the Yes/No radios.
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._didToggleIsAdditionalInformationSupplied = function (isAdditionalInformationSuppliedNewValue) {
    this.additionalBankDetailsSwiftChooserViewModel().resetModel();
    this.clientBeneficiaryModel().additionalBankDetailsInformation().resetModel();

    if (isAdditionalInformationSuppliedNewValue) {
        this._clearSwiftDOMInputs(false, true);
    }
};

/**
 * Disable the return key in <textarea>s (GMP 754).
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype.onKeyDownDisableReturnKey = function (data, event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        return false;
    }
    return true;
};

/**
 * Swift Widget reset: the Swift chooser allows non matching text to remain in the input
 * without firing events. Internally the widget saves a state of "no swift selected".
 * This method clears the swift DOM input elements specified in the arguments.
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._clearSwiftDOMInputs = function (clearBankDetailsSwift, clearAdditionalBankDetailsSwift) {
    if (clearBankDetailsSwift) {
        jQuery("#bankSwiftBicSearch_input").val("");
    }
    if (clearAdditionalBankDetailsSwift) {
        jQuery("#intermediaryBankSwiftBicSearch_input").val("");
    }
};

/**
 * Reset any other DOM to the default "Add Beneficiary" state.
 * Currently: hide the CNY callout panel.
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._resetOtherDOM = function () {
    jQuery("#beneCnyWarning").hide();
};

/**
 * (Subscription) Called when the user toggles the "FCA" checkbox.
 *
 * The bank details' field config needs to be updated when the FCA is checked,
 * and restored to the original (SWIFT version) when unchecked.
 *
 * A cached copy of the FCA field config response is saved (for the current SWIFT
 * bank selected). The cache is cleared when the bank changes. This prevents multiple
 * requests if the user continuously toggles the FCA checkbox, plus the UI is more robust.
 *
 * @param {Boolean} bankFcaNewValue - The new value already saved to
 *     observable: "this.clientBeneficiaryModel().bankDetails().bankFca"
 *
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._didToggleBankFca = function (bankFcaNewValue) {
    // Ths pseudo code looks like:
    //
    // if fca is on (checked)
    //     if fca fieldConfig is cached
    //         apply fieldConfig cache
    //     else
    //         request fca fieldConfig, cache it, apply it
    // else
    //     switch to original SWIFT fieldConfig
    if (bankFcaNewValue) {
        if (this._fcaFieldConfigCache !== null) {
            // apply cache
            this._recreateBankDetailsDisplayModel(this._fcaFieldConfigCache);
        }
        else {
            this._getBankFieldDisplayDetails(true);
        }
    }
    else {
        this._getBankFieldDisplayDetails(false);
        //this._recreateBankDetailsDisplayModel(this.bankDetailsSwiftChooserViewModel().fieldConfig());
    }
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._getBankFieldDisplayDetails = function (fcaEnabled) {
    var sendOptionsData;
    // call REST API to obtain bank details config specifying FCA
    if (this.isBankSwiftBicAvailable()) {
        sendOptionsData = {
            bankId: this.clientBeneficiaryModel().bankDetails().bankId(),
            bankFcaAccountChecked: fcaEnabled
        };
    } else {
        sendOptionsData = {
            countryCode: this.clientBeneficiaryModel().bankDetails().bankCountryCode()
        };
    }
    var successHandler = function (data) {
        gmp.core.Logger.log("gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._getBankFieldDisplayDetails#successHandler");
        if (fcaEnabled) {
            this._fcaFieldConfigCache = data.fieldConfig;
        }
        this._recreateBankDetailsDisplayModel(data.fieldConfig);
    };
    this._handleSendGetBankDetailsConfig(sendOptionsData, successHandler);
};

/**
 * Recreate the "bankDetailsDisplayModel" object using new JSON in the "fieldConfigJSON"
 * param. A new model object is created to replace the existing one (instead of updating
 * the current one), and set as the new value of the observable. This is safer as a new
 * object defaults to hiding everything.
 *
 * @param {Object} fieldConfigJSON - The JSON in the format of "fieldConfig".
 *     NOTE: This sometimes arrives as an empty string which is expected and ignored.
 *
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._recreateBankDetailsDisplayModel = function (fieldConfigJSON) {
    if (fieldConfigJSON !== "") {
        var newModel = new gmp.component.beneficiary.model.BankDetailsDisplayModel();
        newModel.initWithFieldConfigJSON(fieldConfigJSON);
        this.bankDetailsDisplayModel(newModel);

        //A little hack to force the focus onto the first bank details field once they appear.
        try {
            divs = jQuery("#bankExtraFormFieldsDivId div");
            var i;
            for (i = 0; i < divs.length; i++) {
                if (divs[i].style.display != "none") {
                    jQuery("input", divs[i]).focus();
                    break;
                }
            }
        }
        catch (e) {
            this._logError("error trying to focus on first bank details field: " + e);
        }
    }
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._recreateAdditionalBankDetailsDisplayModel = function (fieldConfigJSON) {
    if (fieldConfigJSON !== "") {
        var newModel = new gmp.component.beneficiary.model.AdditionalBankDetailsInformationModel();
        newModel.initWithFieldConfigJSON(fieldConfigJSON);
        this.additionalBankDetailsDisplayModel(newModel);
    }
};

/**
 * Reset the user changeable fields in "Bank details":
 *     "bankFca" (including cache), "bankAccountNumber", "bankClearingCode"
 *
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._resetBankDetailsForUserInput = function () {
    // - clear user input: 'bankFca', 'bankAccountNumber', 'bankClearingCode'
    var bankDetails = this.clientBeneficiaryModel().bankDetails();
    bankDetails.bankFca(false);
    bankDetails.bankAccountNumber("");
    bankDetails.bankClearingCode("");
    // - clear fca cache
    this._fcaFieldConfigCache = null;
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._resetAdditionalBankDetailsForUserInput = function () {
    // - clear user input: 'intermediary swift/bic', 'for further credit'
    var additionalBankDetails = this.clientBeneficiaryModel().additionalBankDetailsInformation();
    additionalBankDetails.bankSwiftCode("");
    additionalBankDetails.forFurtherCreditTo("");
};

/**
 * Call REST API "beneficiaries/bankdetailsconfig/new?..." using the supplied request
 * parameters in "sendOptionsData" and calling the "successHandler" on success.
 *
 * @param {Object} sendOptionsData - Pass the required GET parameters for
 *     the "beneficiaries/bankdetailsconfig/new" REST API in this map.
 *
 * @param {Function} successHandler - The function to call when the request succeeds.
 *     The 'this' is automatically set to this object.
 * @private
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._handleSendGetBankDetailsConfig = function (sendOptionsData, successHandler) {
    var sendOptions = {
        type: 'GET',
        data: sendOptionsData,
        successHandler: successHandler,
        errorHandler: this._handleErrorGetBankDetails,
        callbackObject: this
    };
    this.dataService.send("beneficiaries/bankdetailsconfig/new", sendOptions);
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._handleErrorGetBankDetails = function (data) {
    // on error reset bank details fields display model to defaults
    var defaultModel = new gmp.component.beneficiary.model.BankDetailsDisplayModel();
    this.bankDetailsDisplayModel(defaultModel);

    this._logError("_handleErrorGetBankDetails: " + JSON.stringify(data, null, 2));
};


/**
 * Call REST API: 'beneficiaries' via POST
 *
 * Create a new beneficiary passing the 'clientBeneficiaryModel' model
 * updated from the UI.
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._sendBeneficiaryCreate = function () {
    var self = this;
    self.messagePopupProxy.showLoadingBlocker();
    var sendOptions = {
        type: 'POST',
        model: this.clientBeneficiaryModel(),
        successHandler: this._handleSuccessBeneficiaryCreate,
        errorHandler: this._handleNoResponseError,
        fieldErrorHandler: this._handleFieldErrors,
        completeHandler: function () {
            self.messagePopupProxy.hideLoadingBlocker();
        },
        callbackObject: this
    };
    this.dataService.send(this.dataPaths.BENEFICIARIES_CREATE, sendOptions);
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._sendBeneficiarySave = function () {
    this.messagePopupProxy.showLoadingBlocker();
    // for edition we dont care about those
    this.clientBeneficiaryModel().submittedDateTime().dateTime(null);
    this.clientBeneficiaryModel().submittedDateTime().timeZoneCode(null);
    this.clientBeneficiaryModel().submittedUserDisplayName("");

    var sendOptions = {
        type: 'PUT',
        model: this.clientBeneficiaryModel(),
        successHandler: this._handleSuccessBeneficiaryUpdate,
        fieldErrorHandler: this._handleFieldErrors,
        errorHandler: this._handleNoResponseError,
        callbackObject: this
    };

    this.dataService.send(this.dataPaths.BENEFICIARIES_SAVE, sendOptions);
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._handleSuccessBeneficiaryCreate = function (data) {
    this._logSuccess(this.dataPaths.BENEFICIARIES_CREATE, data);
    this._showSuccessClerkPopup(data);
    this.resetModel();
    this._applySavedNewBeneficiaryResponse(false); // false - isInitialResponse flag
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._handleSuccessBeneficiaryUpdate = function (data) {
    this._logSuccess(this.dataPaths.BENEFICIARIES_EDIT, data);
    this._returnFromEdit(true);
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._handleNoResponseError = function (data) {
    this.messagePopupProxy.showTemplateMessage("no-response-error", null, this);
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._handleFieldErrors = function (errorsContext) {
    errorsContext.performDefaultHandling = false;
    this.messagePopupProxy.hideLoadingBlocker();
    gmp.core.mapper.ModelErrorFieldMapper.map(errorsContext.fieldErrors, this.clientBeneficiaryModel());
    gmp.core.Utils.scrollUpToFirstValidationError(this.eElement);
};


/**
 * Logging helpers for REST API responses.
 */
gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._logSuccess = function (restPath, data) {
    caplin.core.Logger.log(caplin.core.LogLevel.DEBUG, "SUCCESS RESPONSE: [" + restPath + "]");
    caplin.core.Logger.log(caplin.core.LogLevel.DEBUG, data);
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._logError = function (restPath, data) {
    caplin.core.Logger.log(caplin.core.LogLevel.ERROR, "ERROR RESPONSE: [" + restPath + "]");
    caplin.core.Logger.log(caplin.core.LogLevel.ERROR, data);
};


gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._showSuccessClerkPopup = function () {
    var clientType, approverType, popupContentParameter;

    popupContentParameter = {
        BENE: this.clientBeneficiaryModel().beneficiaryDetails().code()
    };

    this.popupParameterizedContent(ct.i18n("gmp.beneficiary.approval.popup.sub.content", popupContentParameter));

    this._updateApprovalType();
    this.messagePopupProxy.showTemplateMessage("popup-beneficiary-approved-template", null, this);

};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._updateApprovalType = function () {
    var approvalType, approverType;

    approvalType = this.userSession.getFeatureApprovalType('BENEFICIARY');
    approverType = this.userSession.approvalInfo().approverType();

    if (approverType === "APPROVER") {
        if (approvalType === "DUAL_APPROVAL") {
            this.approvalType('first');
        } else {
            this.approvalType('final');
        }
    } else {
        //clerk
        this.approvalType('only');
    }
};

gmp.component.beneficiary.AddEditBeneficiaryComponent.prototype._forceRadioBindingsUpdate = function () {
    // toggle the radio values to force a UI repaint and update for IE7. also ``checked="checked"'' should
    // be present on the radio DOM for the radio whose initial DOM "value" attribute is the checked value.
    this.isBankSwiftBicAvailableAsBooleanString("false");
    this.isBankSwiftBicAvailableAsBooleanString("true");
    this.isAdditionalInformationSuppliedAsBooleanString("true");
    this.isAdditionalInformationSuppliedAsBooleanString("false");
};

