var RSVP = require('rsvp');

var platformMatcher = require('mm-platform-matcher');


var _dataAdapter = null;
var assessmentStatuses = {};

var NO_PLATFORM_MATCHING = 'No platform matching tags';
var NO_TEST_MATCHING = 'No test matching tags';
var PENDING = 'Pending';
var SUCCESS = 'Success';
var FAILURE = 'Failure';


function Assessments(dataAdapter) {
    this._dataAdapter = dataAdapter;
}


Assessments.prototype = {
    getTagsFromTest: function getTagsFromTest(test) {
        for(var testTags in test) {}
        return testTags;
    },

    getAssessmentStatus: function getAssessmentStatus(tests, assessmentId) {
        var result = [];

        return RSVP.hash({
            results: this._dataAdapter.get('results'),
            assessmentDefinition: this._dataAdapter.get('assessment/' + assessmentId + '/definition')
        })
            .then(function(hash) {
                tests.forEach(function(test) {
                    var testResultForEachConstraint = this.getTestResultForEachConstraint(
                        hash.assessmentDefinition,
                        this.getTagsFromTest(test),
                        hash.results,
                        assessmentId
                        );
                    result = result.concat(testResultForEachConstraint);
                }.bind(this));

                result = this.reduceTestResults(result);
                return result;
            }.bind(this));
    },

    reduceTestResults: function reduceTestResults(resultArray) {
        return resultArray.reduce(function(element1, element2) {
            if(element1 === NO_PLATFORM_MATCHING && element2 === NO_TEST_MATCHING) {
                return NO_PLATFORM_MATCHING;
            }
            if(element1 === NO_TEST_MATCHING || element1 === NO_PLATFORM_MATCHING || element1 === null) {
                return element2;
            }
            if(element1 === FAILURE || element2 === FAILURE) {
                return FAILURE;
            }
            if(element1 === PENDING || element2 === PENDING) {
                return PENDING;
            }
            return SUCCESS;
        }, null);
    },

    getTestResultForEachConstraint: function getTestResultForEachConstraint(
        assessmentDefinition,
        testTags,
        results,
        assessmentId
    ) {
        return assessmentDefinition.map(function(definition) {
            // check that the test qualifies for this constraint
            var assessmentTestTags = definition[0];
            var assessmentPlatformTags = definition[1].split(',').map(function(tag) {return tag.trim()});

            if(this.matchTags(assessmentTestTags, testTags)) {
                if(!platformMatcher.isAKnownPlatform(assessmentPlatformTags)) {
                    return NO_PLATFORM_MATCHING;
                }
                // check that it was launched on the right platforms
                var matchingResults = (results
                    .filter(function(result) {
                        return this.matchTags(testTags, result.tags) && platformMatcher.match(assessmentPlatformTags, result.ua);
                    })
                    .filter(function(result) {
                        return result.reportTime > assessmentId;
                    }));
                if(!matchingResults.length) {
                    return PENDING;
                }
                return matchingResults.every(function(result) {return !result.failures;}) ? SUCCESS : FAILURE;
            }
            return NO_TEST_MATCHING;
        }.bind(this));
    },

    convert: function convert(tagList) {
        if(typeof tagList !== 'string') {
            return tagList;
        }
        return tagList.split(',').map(function(element) {return element.trim();});
    },

    matchTags: function matchTags(candidates, reference) {
        candidates = this.convert(candidates);
        reference = this.convert(reference);
        return candidates.every(function(candidate) {
            return reference.indexOf(candidate) !== -1;
        });
    },

    createAssessment: function createAssessment(name, testTags, platformTags, creationTime) {
        return this._dataAdapter.get('assessments')
            .then(function(assessmentNames) {
                assessmentNames.push(creationTime);
                return this._dataAdapter.set('assessments', assessmentNames);
            }.bind(this))
            .then(function() {
                return RSVP.all([
                    this._dataAdapter.set('assessment/' + creationTime + '/name', name),
                    this._dataAdapter.set('assessment/' + creationTime + '/definition', [[testTags, platformTags]])
                ]);
            }.bind(this));
    },

    getAssessments: function getAssessments() {
        var expectedResults = {};
        var testLib;
        
        return this._dataAdapter.get('tests/library')
            .then(function(testLibrary) {
                testLib = testLibrary;
                return this._dataAdapter.get('assessments');
            }.bind(this))
            .then(function(assessmentIds) {
                return RSVP.all(assessmentIds.map(function(assessmentId) {
                        return RSVP.hash({
                            name: this._dataAdapter.get('assessment/' + assessmentId + '/name'),
                            definition: this._dataAdapter.get('assessment/' + assessmentId + '/definition'),
                            status: this.getAssessmentStatus(testLib, assessmentId)
                        });
                    }.bind(this)))
                    .then(function(assessments) {
                        return assessments.map(function(assessment, index) {
                            return {
                                name: assessment.name,
                                status: assessment.status,
                                definition: assessment.definition,
                                id: assessmentIds[index]
                            };
                        });
                    }.bind(this));
            }.bind(this))
    }
};


module.exports = Assessments;
