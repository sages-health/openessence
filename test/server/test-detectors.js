'use strict';

var expect = require('chai').expect;
var request = require('supertest');

var hidalgo = require('hidalgo');
var detector = require('../../server/detectors');

describe('detectors', function () {
    describe('cusum', function () {
        it('should work', function (done) {
            var data = [0, 1, 2, 3, 4];
            var baseline = 1;
            var guardBand = 1;

            request(detector())
                .post('/cusum')
                .send({
                    data: data,
                    baseline: baseline,
                    guardBand: guardBand
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    expect(Object.keys(res.body).length).to.equal(2);
                    expect(res.body.testStats).to.deep.equal(hidalgo.cusum.testStat(data, baseline, guardBand));
                    expect(res.body.pValues).to.deep.equal(res.body.testStats.map(hidalgo.cusum.pValue));

                    done();
                });
        });
    });
});